import { index, integer, jsonb, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

/**
 * Tabelas do DEV-OH!. Mudou algo aqui? Gere a migration com `npm run db:generate -w @devoh/server`
 * e versione o SQL em `apps/server/drizzle/`: o servidor aplica as pendentes ao subir.
 */

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Sempre minúsculo: o login não diferencia maiúsculas. */
    username: text('username').notNull(),
    displayName: text('display_name').notNull(),
    passwordHash: text('password_hash').notNull(),
    elo: integer('elo').notNull().default(1000),
    wins: integer('wins').notNull().default(0),
    losses: integer('losses').notNull().default(0),
    draws: integer('draws').notNull().default(0),
    /** Senhas erradas seguidas; ao chegar no limite, a conta fica travada até `locked_until`. */
    failedLogins: integer('failed_logins').notNull().default(0),
    lockedUntil: timestamp('locked_until', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('users_username_key').on(t.username), index('users_ranking_idx').on(t.elo.desc(), t.wins.desc())],
);

/** Sessões de login. Só o hash SHA-256 do token fica aqui; o token vive no cookie HttpOnly. */
export const sessions = pgTable(
  'sessions',
  {
    tokenHash: text('token_hash').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index('sessions_user_idx').on(t.userId)],
);

/** Decks de cada conta. O `id` vem do cliente (ex.: "custom-lq3x9"), único por conta. */
export const decks = pgTable(
  'decks',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    id: text('id').notNull(),
    name: text('name').notNull(),
    description: text('description').notNull().default(''),
    cards: jsonb('cards').$type<string[]>().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.id] })],
);

/** Partidas online entre duas contas, com a variação de Elo de cada uma. */
export const matches = pgTable(
  'matches',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    playedAt: timestamp('played_at', { withTimezone: true }).notNull().defaultNow(),
    p0User: uuid('p0_user')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    p1User: uuid('p1_user')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** null = empate. */
    winnerUser: uuid('winner_user').references(() => users.id, { onDelete: 'cascade' }),
    reason: text('reason').notNull(),
    turns: integer('turns').notNull(),
    eloDeltaP0: integer('elo_delta_p0').notNull(),
    eloDeltaP1: integer('elo_delta_p1').notNull(),
  },
  (t) => [index('matches_p0_idx').on(t.p0User, t.playedAt.desc()), index('matches_p1_idx').on(t.p1User, t.playedAt.desc())],
);
