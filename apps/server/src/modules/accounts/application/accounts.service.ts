import { sanitizeName, type AccountView, type LoginPayload, type RegisterPayload } from '@devoh/protocol';
import { Inject, Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { DomainError } from '../../../common/domain-error.js';
import { SecurityLog } from '../../../common/security/security-log.js';
import { AppConfig } from '../../../config/app-config.js';
import { CLOCK, type Clock } from '../../rooms/application/ports.js';
import {
  ACCOUNT_REPOSITORY,
  HUMAN_VERIFIER,
  PASSWORD_HASHER,
  type AccountRepository,
  type HumanVerifier,
  type PasswordHasher,
  type UserRecord,
} from './ports.js';

/** Senhas erradas seguidas que travam a conta, e por quanto tempo. */
export const MAX_FAILED_LOGINS = 10;
export const LOCK_MS = 15 * 60 * 1000;
/** A sessão só é renovada no banco quando já passou um dia desde a última renovação. */
const RENEW_AFTER_MS = 24 * 60 * 60 * 1000;

export const INVALID_LOGIN = 'Usuário ou senha inválidos.';

/** Login aceito: a conta e o token que vai no cookie (nunca no corpo da resposta). */
export interface SessionResult {
  account: AccountView;
  token: string;
}

export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export const toAccountView = (u: UserRecord): AccountView => ({
  username: u.username,
  displayName: u.displayName,
  elo: u.elo,
  wins: u.wins,
  losses: u.losses,
  draws: u.draws,
});

/** Casos de uso de conta: cadastro, login, sessão, logout e troca de senha. */
@Injectable()
export class AccountsService {
  /** Hash de uma senha qualquer: o login de usuário inexistente gasta o mesmo tempo que o de um existente. */
  private dummyHash: Promise<string> | null = null;

  constructor(
    @Inject(ACCOUNT_REPOSITORY) private readonly repo: AccountRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(HUMAN_VERIFIER) private readonly human: HumanVerifier,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(AppConfig) private readonly config: AppConfig,
    @Inject(SecurityLog) private readonly security: SecurityLog,
  ) {}

  async register(input: RegisterPayload, ip: string): Promise<SessionResult> {
    if (!(await this.human.verify(input.turnstileToken, ip))) {
      this.security.warn('signup-refused', ip);
      throw new DomainError('Não deu para confirmar que você não é um robô. Tente de novo.');
    }
    const user = await this.repo.create({
      username: input.username,
      displayName: sanitizeName(input.displayName, input.username),
      passwordHash: await this.hasher.hash(input.password),
    });
    if (!user) throw new DomainError('Esse usuário já existe. Escolha outro.', 409);
    return { account: toAccountView(user), token: await this.startSession(user.id) };
  }

  async login(input: LoginPayload, ip: string): Promise<SessionResult> {
    const user = await this.repo.findByUsername(input.username);
    if (!user) {
      await this.hasher.verify(await this.dummy(), input.password);
      this.security.warn('login-failed', ip);
      throw new DomainError(INVALID_LOGIN, 401);
    }
    const now = this.clock.now();
    if (user.lockedUntil && user.lockedUntil.getTime() > now) {
      throw new DomainError('Muitas tentativas erradas. Espere alguns minutos e tente de novo.', 429);
    }
    if (!(await this.hasher.verify(user.passwordHash, input.password))) {
      const failed = user.failedLogins + 1;
      const locked = failed >= MAX_FAILED_LOGINS;
      await this.repo.setFailedLogins(user.id, locked ? 0 : failed, locked ? new Date(now + LOCK_MS) : null);
      this.security.warn(locked ? 'account-locked' : 'login-failed', ip);
      throw new DomainError(INVALID_LOGIN, 401);
    }
    if (user.failedLogins || user.lockedUntil) await this.repo.setFailedLogins(user.id, 0, null);
    return { account: toAccountView(user), token: await this.startSession(user.id) };
  }

  /**
   * Conta dona do token do cookie, se a sessão ainda vale. `renewed` = a validade foi
   * estendida (o cookie deve ser reenviado com o prazo novo).
   */
  async resolve(token: string | undefined): Promise<{ user: UserRecord; renewed: boolean } | null> {
    if (!token) return null;
    const now = this.clock.now();
    const found = await this.repo.findSession(hashToken(token), new Date(now));
    if (!found) return null;
    const ttl = this.config.sessionTtlMs;
    const renew = found.expiresAt.getTime() - now < ttl - RENEW_AFTER_MS;
    if (renew) await this.repo.renewSession(hashToken(token), new Date(now + ttl));
    return { user: found.user, renewed: renew };
  }

  async logout(token: string | undefined) {
    if (token) await this.repo.deleteSession(hashToken(token));
  }

  /** Troca a senha e derruba todas as sessões da conta; devolve o token da sessão nova. */
  async changePassword(user: UserRecord, current: string, next: string): Promise<string> {
    const fresh = await this.repo.findById(user.id);
    if (!fresh || !(await this.hasher.verify(fresh.passwordHash, current))) throw new DomainError('Senha atual incorreta.', 401);
    await this.repo.setPassword(user.id, await this.hasher.hash(next));
    await this.repo.deleteUserSessions(user.id);
    return this.startSession(user.id);
  }

  private async startSession(userId: string) {
    const now = this.clock.now();
    await this.repo.deleteExpiredSessions(new Date(now));
    const token = randomBytes(32).toString('base64url');
    await this.repo.createSession(hashToken(token), userId, new Date(now + this.config.sessionTtlMs));
    return token;
  }

  private dummy() {
    this.dummyHash ??= this.hasher.hash(randomBytes(16).toString('hex'));
    return this.dummyHash;
  }
}
