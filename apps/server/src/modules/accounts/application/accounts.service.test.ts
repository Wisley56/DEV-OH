import { beforeEach, describe, expect, it } from 'vitest';
import { SecurityLog } from '../../../common/security/security-log.js';
import { AppConfig } from '../../../config/app-config.js';
import { AccountsService, hashToken, LOCK_MS, MAX_FAILED_LOGINS } from './accounts.service.js';
import type { AccountRepository, NewUser, UserRecord } from './ports.js';

const DAY = 24 * 60 * 60 * 1000;

/** Repositório em memória com o mesmo contrato do Drizzle. */
class FakeRepo implements AccountRepository {
  users: UserRecord[] = [];
  sessions = new Map<string, { userId: string; expiresAt: Date }>();

  async findByUsername(username: string) {
    return this.users.find((u) => u.username === username) ?? null;
  }
  async findById(id: string) {
    return this.users.find((u) => u.id === id) ?? null;
  }
  async create(u: NewUser) {
    if (this.users.some((x) => x.username === u.username)) return null;
    const user: UserRecord = {
      id: `u${this.users.length + 1}`,
      elo: 1000,
      wins: 0,
      losses: 0,
      draws: 0,
      failedLogins: 0,
      lockedUntil: null,
      ...u,
    };
    this.users.push(user);
    return user;
  }
  async setFailedLogins(id: string, failedLogins: number, lockedUntil: Date | null) {
    Object.assign((await this.findById(id))!, { failedLogins, lockedUntil });
  }
  async setPassword(id: string, passwordHash: string) {
    Object.assign((await this.findById(id))!, { passwordHash, failedLogins: 0, lockedUntil: null });
  }
  async createSession(tokenHash: string, userId: string, expiresAt: Date) {
    this.sessions.set(tokenHash, { userId, expiresAt });
  }
  async findSession(tokenHash: string, now: Date) {
    const s = this.sessions.get(tokenHash);
    if (!s || s.expiresAt <= now) return null;
    return { user: (await this.findById(s.userId))!, expiresAt: s.expiresAt };
  }
  async renewSession(tokenHash: string, expiresAt: Date) {
    this.sessions.get(tokenHash)!.expiresAt = expiresAt;
  }
  async deleteSession(tokenHash: string) {
    this.sessions.delete(tokenHash);
  }
  async deleteUserSessions(userId: string) {
    for (const [k, s] of this.sessions) if (s.userId === userId) this.sessions.delete(k);
  }
  async deleteExpiredSessions(now: Date) {
    for (const [k, s] of this.sessions) if (s.expiresAt <= now) this.sessions.delete(k);
  }
}

describe('AccountsService', () => {
  let now: number;
  let repo: FakeRepo;
  let human: boolean;
  let svc: AccountsService;
  const signup = { username: 'ana', displayName: 'Ana', password: 'senha-forte-1', turnstileToken: 't' };

  beforeEach(() => {
    now = Date.UTC(2026, 0, 1);
    repo = new FakeRepo();
    human = true;
    const hasher = { hash: async (p: string) => `h:${p}`, verify: async (h: string, p: string) => h === `h:${p}` };
    svc = new AccountsService(
      repo,
      hasher,
      { verify: async () => human },
      { now: () => now },
      new AppConfig({ SESSION_TTL_DAYS: '30' }),
      new SecurityLog(),
    );
  });

  it('cadastra, guarda só o hash do token e resolve a sessão', async () => {
    const { account, token } = await svc.register(signup, '1.1.1.1');
    expect(account).toMatchObject({ username: 'ana', displayName: 'Ana', elo: 1000 });
    expect(repo.users[0].passwordHash).toBe('h:senha-forte-1');
    expect([...repo.sessions.keys()]).toEqual([hashToken(token)]);
    expect((await svc.resolve(token))?.user.username).toBe('ana');
    expect(await svc.resolve('outro')).toBeNull();
    expect(await svc.resolve(undefined)).toBeNull();
  });

  it('recusa robô e usuário repetido', async () => {
    human = false;
    await expect(svc.register(signup, 'ip')).rejects.toThrow('robô');
    human = true;
    await svc.register(signup, 'ip');
    await expect(svc.register(signup, 'ip')).rejects.toMatchObject({ status: 409 });
  });

  it('senha errada dá a mesma mensagem que usuário inexistente e trava após o limite', async () => {
    await svc.register(signup, 'ip');
    await expect(svc.login({ username: 'ninguem', password: 'x' }, 'ip')).rejects.toThrow('Usuário ou senha inválidos.');
    for (let i = 0; i < MAX_FAILED_LOGINS; i++) {
      await expect(svc.login({ username: 'ana', password: 'errada' }, 'ip')).rejects.toMatchObject({ status: 401 });
    }
    await expect(svc.login({ username: 'ana', password: 'senha-forte-1' }, 'ip')).rejects.toMatchObject({ status: 429 });
    now += LOCK_MS + 1;
    await expect(svc.login({ username: 'ana', password: 'senha-forte-1' }, 'ip')).resolves.toMatchObject({ account: { username: 'ana' } });
    expect(repo.users[0].failedLogins).toBe(0);
  });

  it('sessão vence no prazo e é renovada depois de um dia de uso', async () => {
    const { token } = await svc.register(signup, 'ip');
    expect((await svc.resolve(token))?.renewed).toBe(false);
    now += 2 * DAY;
    expect((await svc.resolve(token))?.renewed).toBe(true);
    expect(repo.sessions.get(hashToken(token))!.expiresAt.getTime()).toBe(now + 30 * DAY);
    now += 31 * DAY;
    expect(await svc.resolve(token)).toBeNull();
  });

  it('logout apaga a sessão; trocar a senha derruba todas', async () => {
    const { token: a } = await svc.register(signup, 'ip');
    const { token: b } = await svc.login(signup, 'ip');
    await svc.logout(a);
    expect(await svc.resolve(a)).toBeNull();

    const user = repo.users[0];
    await expect(svc.changePassword(user, 'errada', 'nova-senha-1')).rejects.toThrow('Senha atual incorreta.');
    const fresh = await svc.changePassword(user, 'senha-forte-1', 'nova-senha-1');
    expect(await svc.resolve(b)).toBeNull();
    expect((await svc.resolve(fresh))?.user.id).toBe(user.id);
    await expect(svc.login(signup, 'ip')).rejects.toThrow('Usuário ou senha inválidos.');
  });
});
