import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { migrate as migratePglite } from 'drizzle-orm/pglite/migrator';
import { drizzle as drizzlePg, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { migrate as migratePg } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import * as schema from './schema.js';

/** Banco com o schema do DEV-OH!. O PGlite expõe a mesma API do Drizzle que o Postgres. */
export type Db = NodePgDatabase<typeof schema>;

export interface Database {
  db: Db;
  close(): Promise<void>;
}

/** Migrations versionadas em apps/server/drizzle (vale para src/ e para dist/). */
const MIGRATIONS = join(dirname(fileURLToPath(import.meta.url)), '../../../drizzle');

/**
 * Abre o banco e aplica as migrations pendentes.
 * - `postgres://…`: Postgres de verdade (Railway), com pool de até `poolMax` conexões.
 * - `pglite://memory`: Postgres embutido em memória (testes).
 * - `pglite://<pasta>`: Postgres embutido gravando na pasta (dev, sem Docker).
 */
export async function openDatabase(url: string, poolMax: number): Promise<Database> {
  if (url.startsWith('pglite://')) {
    const where = url.slice('pglite://'.length);
    if (where !== 'memory') mkdirSync(where, { recursive: true });
    const client = new PGlite(where === 'memory' ? undefined : where);
    const db = drizzlePglite({ client, schema });
    await migratePglite(db, { migrationsFolder: MIGRATIONS });
    return { db: db as unknown as Db, close: () => client.close() };
  }
  const pool = new pg.Pool({ connectionString: url, max: poolMax });
  const db = drizzlePg({ client: pool, schema });
  await migratePg(db, { migrationsFolder: MIGRATIONS });
  return { db, close: () => pool.end() };
}
