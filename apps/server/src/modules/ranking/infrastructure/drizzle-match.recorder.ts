import { Inject, Injectable } from '@nestjs/common';
import { eq, inArray, sql } from 'drizzle-orm';
import type { MatchRecorder, MatchResult } from '../../rooms/application/ports.js';
import { DB } from '../../db/db.module.js';
import type { Db } from '../../db/database.js';
import { matches, users } from '../../db/schema.js';
import { eloDelta } from '../application/elo.js';

/** Grava a partida e atualiza Elo e V/D/E das duas contas numa transação só. */
@Injectable()
export class DrizzleMatchRecorder implements MatchRecorder {
  constructor(@Inject(DB) private readonly db: Db) {}

  record(r: MatchResult): Promise<[number, number]> {
    return this.db.transaction(async (tx) => {
      // FOR UPDATE: duas partidas da mesma conta terminando juntas não perdem pontos.
      const rows = await tx.select({ id: users.id, elo: users.elo }).from(users).where(inArray(users.id, r.users)).for('update');
      const elo = r.users.map((id) => rows.find((u) => u.id === id)?.elo);
      if (elo[0] === undefined || elo[1] === undefined) throw new Error('conta da partida não existe mais');
      const score = r.winner === null ? 0.5 : r.winner === 0 ? 1 : 0;
      const delta = eloDelta(elo[0], elo[1], score);

      // O id é o da partida na sala: gravar duas vezes a mesma não conta em dobro.
      const inserted = await tx
        .insert(matches)
        .values({
          id: r.matchId,
          p0User: r.users[0],
          p1User: r.users[1],
          winnerUser: r.winner === null ? null : r.users[r.winner],
          reason: r.reason,
          turns: r.turns,
          eloDeltaP0: delta[0],
          eloDeltaP1: delta[1],
        })
        .onConflictDoNothing({ target: matches.id })
        .returning({ id: matches.id });
      if (!inserted.length) return delta;

      for (const seat of [0, 1] as const) {
        const result = r.winner === null ? 'draws' : r.winner === seat ? 'wins' : 'losses';
        await tx
          .update(users)
          .set({ elo: sql`${users.elo} + ${delta[seat]}`, [result]: sql`${users[result]} + 1` })
          .where(eq(users.id, r.users[seat]));
      }
      return delta;
    });
  }
}
