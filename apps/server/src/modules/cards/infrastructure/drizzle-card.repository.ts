import type { CustomCardInput } from '@devoh/engine';
import { Inject, Injectable } from '@nestjs/common';
import { and, count, eq, inArray, max, sql } from 'drizzle-orm';
import { DB } from '../../db/db.module.js';
import type { Db } from '../../db/database.js';
import { customCards } from '../../db/schema.js';
import type { CardPatch, CardRepository, CustomCardRow } from '../application/ports.js';

const columns = {
  id: customCards.id,
  status: customCards.status,
  input: customCards.input,
  serial: customCards.serial,
  version: customCards.version,
  artVersion: customCards.artVersion,
  artBytes: customCards.artBytes,
  updatedAt: customCards.updatedAt,
};

@Injectable()
export class DrizzleCardRepository implements CardRepository {
  constructor(@Inject(DB) private readonly db: Db) {}

  list(): Promise<CustomCardRow[]> {
    return this.db.select(columns).from(customCards).orderBy(customCards.createdAt);
  }

  listInstalled(): Promise<CustomCardRow[]> {
    return this.db
      .select(columns)
      .from(customCards)
      .where(inArray(customCards.status, ['published', 'retired']))
      .orderBy(customCards.serial);
  }

  async get(id: string) {
    const [row] = await this.db.select(columns).from(customCards).where(eq(customCards.id, id)).limit(1);
    return row ?? null;
  }

  async count() {
    const [row] = await this.db.select({ n: count() }).from(customCards);
    return row?.n ?? 0;
  }

  async insert(input: CustomCardInput, userId: string) {
    const [row] = await this.db
      .insert(customCards)
      .values({ id: input.id, input, createdBy: userId, updatedBy: userId })
      .onConflictDoNothing()
      .returning(columns);
    return row ?? null;
  }

  async update(id: string, guard: { version?: number; artVersion?: number }, patch: CardPatch, userId: string, bump: boolean) {
    const where = [eq(customCards.id, id)];
    if (guard.version !== undefined) where.push(eq(customCards.version, guard.version));
    if (guard.artVersion !== undefined) where.push(eq(customCards.artVersion, guard.artVersion));
    const [row] = await this.db
      .update(customCards)
      .set({
        ...patch,
        updatedBy: userId,
        updatedAt: sql`now()`,
        ...(bump && { version: sql`${customCards.version} + 1` }),
      })
      .where(and(...where))
      .returning(columns);
    return row ?? null;
  }

  async nextSerial() {
    const [row] = await this.db.select({ n: max(customCards.serial) }).from(customCards);
    return (row?.n ?? 0) + 1;
  }

  async delete(id: string) {
    const rows = await this.db.delete(customCards).where(eq(customCards.id, id)).returning({ id: customCards.id });
    return rows.length > 0;
  }
}
