import { defineConfig } from 'drizzle-kit';

/** Só gera o SQL das migrations a partir do schema (não conecta no banco). */
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/modules/db/schema.ts',
  out: './drizzle',
});
