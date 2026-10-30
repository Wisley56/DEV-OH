import { Inject, Injectable } from '@nestjs/common';
import { and, eq, gt, lte } from 'drizzle-orm';
import { DB } from '../../db/db.module.js';
import type { Db } from '../../db/database.js';
import { sessions, users } from '../../db/schema.js';
import type { AccountRepository, NewUser, UserRecord } from '../application/ports.js';

@Injectable()
export class DrizzleAccountRepository implements AccountRepository {
  constructor(@Inject(DB) private readonly db: Db) {}

  async findByUsername(username: string): Promise<UserRecord | null> {
    const [u] = await this.db.select().from(users).where(eq(users.username, username)).limit(1);
    return u ?? null;
  }

  async findById(id: string): Promise<UserRecord | null> {
    const [u] = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return u ?? null;
  }

  async create(user: NewUser): Promise<UserRecord | null> {
    // O índice único do username resolve a corrida de dois cadastros iguais ao mesmo tempo.
    const [u] = await this.db.insert(users).values(user).onConflictDoNothing({ target: users.username }).returning();
    return u ?? null;
  }

  async setFailedLogins(id: string, failedLogins: number, lockedUntil: Date | null) {
    await this.db.update(users).set({ failedLogins, lockedUntil }).where(eq(users.id, id));
  }

  async setPassword(id: string, passwordHash: string) {
    await this.db.update(users).set({ passwordHash, failedLogins: 0, lockedUntil: null }).where(eq(users.id, id));
  }

  async createSession(tokenHash: string, userId: string, expiresAt: Date) {
    await this.db.insert(sessions).values({ tokenHash, userId, expiresAt });
  }

  async findSession(tokenHash: string, now: Date) {
    const [row] = await this.db
      .select({ user: users, expiresAt: sessions.expiresAt })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, now)))
      .limit(1);
    return row ?? null;
  }

  async renewSession(tokenHash: string, expiresAt: Date) {
    await this.db.update(sessions).set({ expiresAt }).where(eq(sessions.tokenHash, tokenHash));
  }

  async deleteSession(tokenHash: string) {
    await this.db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
  }

  async deleteUserSessions(userId: string) {
    await this.db.delete(sessions).where(eq(sessions.userId, userId));
  }

  async deleteExpiredSessions(now: Date) {
    await this.db.delete(sessions).where(lte(sessions.expiresAt, now));
  }
}
