import type { MatchHistoryEntry, RankingEntry } from '@devoh/protocol';
import { Inject, Injectable } from '@nestjs/common';
import { desc, eq, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { DB } from '../../db/db.module.js';
import type { Db } from '../../db/database.js';
import { matches, users } from '../../db/schema.js';
import type { RankingRepository } from '../application/ports.js';

const p0 = alias(users, 'p0');
const p1 = alias(users, 'p1');

@Injectable()
export class DrizzleRankingRepository implements RankingRepository {
  constructor(@Inject(DB) private readonly db: Db) {}

  async top(limit: number): Promise<RankingEntry[]> {
    const played = sql<number>`${users.wins} + ${users.losses} + ${users.draws}`;
    // Ordem igual à do índice users_ranking_idx (elo desc, wins desc).
    const rows = await this.db
      .select({
        username: users.username,
        displayName: users.displayName,
        elo: users.elo,
        wins: users.wins,
        losses: users.losses,
        draws: users.draws,
      })
      .from(users)
      .where(sql`${played} > 0`)
      .orderBy(desc(users.elo), desc(users.wins), users.username)
      .limit(limit);
    return rows.map((u, i) => {
      const total = u.wins + u.losses + u.draws;
      return { position: i + 1, ...u, played: total, winRate: total ? Math.round((u.wins / total) * 100) : null };
    });
  }

  async history(userId: string, limit: number): Promise<MatchHistoryEntry[]> {
    const rows = await this.db
      .select({
        id: matches.id,
        playedAt: matches.playedAt,
        p0User: matches.p0User,
        winnerUser: matches.winnerUser,
        reason: matches.reason,
        eloDeltaP0: matches.eloDeltaP0,
        eloDeltaP1: matches.eloDeltaP1,
        p0Name: p0.displayName,
        p1Name: p1.displayName,
      })
      .from(matches)
      .innerJoin(p0, eq(p0.id, matches.p0User))
      .innerJoin(p1, eq(p1.id, matches.p1User))
      .where(or(eq(matches.p0User, userId), eq(matches.p1User, userId)))
      .orderBy(desc(matches.playedAt))
      .limit(limit);
    return rows.map((m) => {
      const mine = m.p0User === userId ? 0 : 1;
      return {
        id: m.id,
        playedAt: m.playedAt.toISOString(),
        opponent: mine === 0 ? m.p1Name : m.p0Name,
        result: m.winnerUser === null ? 'draw' : m.winnerUser === userId ? 'win' : 'loss',
        reason: m.reason,
        eloDelta: mine === 0 ? m.eloDeltaP0 : m.eloDeltaP1,
      };
    });
  }
}
