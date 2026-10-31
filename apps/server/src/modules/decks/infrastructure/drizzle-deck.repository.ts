import type { DeckPayload } from '@devoh/protocol';
import { Inject, Injectable } from '@nestjs/common';
import { and, count, eq, sql } from 'drizzle-orm';
import { DB } from '../../db/db.module.js';
import type { Db } from '../../db/database.js';
import { decks } from '../../db/schema.js';
import type { DeckRepository } from '../application/decks.service.js';

const columns = { id: decks.id, name: decks.name, description: decks.description, cards: decks.cards };

@Injectable()
export class DrizzleDeckRepository implements DeckRepository {
  constructor(@Inject(DB) private readonly db: Db) {}

  list(userId: string): Promise<DeckPayload[]> {
    return this.db.select(columns).from(decks).where(eq(decks.userId, userId)).orderBy(decks.updatedAt);
  }

  async count(userId: string) {
    const [row] = await this.db.select({ n: count() }).from(decks).where(eq(decks.userId, userId));
    return row?.n ?? 0;
  }

  async exists(userId: string, id: string) {
    const [row] = await this.db
      .select({ id: decks.id })
      .from(decks)
      .where(and(eq(decks.userId, userId), eq(decks.id, id)))
      .limit(1);
    return !!row;
  }

  async upsert(userId: string, deck: DeckPayload) {
    await this.db
      .insert(decks)
      .values({ userId, ...deck })
      .onConflictDoUpdate({
        target: [decks.userId, decks.id],
        set: { name: deck.name, description: deck.description, cards: deck.cards, updatedAt: sql`now()` },
      });
  }

  async insertMissing(userId: string, list: DeckPayload[]) {
    const rows = await this.db
      .insert(decks)
      .values(list.map((d) => ({ userId, ...d })))
      .onConflictDoNothing()
      .returning({ id: decks.id });
    return rows.length;
  }

  async delete(userId: string, id: string) {
    const rows = await this.db
      .delete(decks)
      .where(and(eq(decks.userId, userId), eq(decks.id, id)))
      .returning({ id: decks.id });
    return rows.length > 0;
  }
}
