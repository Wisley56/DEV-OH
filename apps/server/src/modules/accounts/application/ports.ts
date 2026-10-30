/** Portas da aplicação de contas: implementadas na infraestrutura. */

export interface UserRecord {
  id: string;
  username: string;
  displayName: string;
  passwordHash: string;
  elo: number;
  wins: number;
  losses: number;
  draws: number;
  failedLogins: number;
  lockedUntil: Date | null;
}

export interface NewUser {
  username: string;
  displayName: string;
  passwordHash: string;
}

export interface AccountRepository {
  findByUsername(username: string): Promise<UserRecord | null>;
  findById(id: string): Promise<UserRecord | null>;
  /** null se o usuário já existe. */
  create(user: NewUser): Promise<UserRecord | null>;
  setFailedLogins(id: string, failedLogins: number, lockedUntil: Date | null): Promise<void>;
  setPassword(id: string, passwordHash: string): Promise<void>;

  createSession(tokenHash: string, userId: string, expiresAt: Date): Promise<void>;
  /** Sessão ainda válida em `now`, com a conta dona dela. */
  findSession(tokenHash: string, now: Date): Promise<{ user: UserRecord; expiresAt: Date } | null>;
  renewSession(tokenHash: string, expiresAt: Date): Promise<void>;
  deleteSession(tokenHash: string): Promise<void>;
  deleteUserSessions(userId: string): Promise<void>;
  deleteExpiredSessions(now: Date): Promise<void>;
}

export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(hash: string, password: string): Promise<boolean>;
}

/** Confere a resposta do desafio anti-robô do cadastro. */
export interface HumanVerifier {
  verify(token: string, ip: string): Promise<boolean>;
}

export const ACCOUNT_REPOSITORY = Symbol('AccountRepository');
export const PASSWORD_HASHER = Symbol('PasswordHasher');
export const HUMAN_VERIFIER = Symbol('HumanVerifier');
