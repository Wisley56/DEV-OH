import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Os e2e sobem o servidor com o banco PGlite e criam contas (argon2): com o turbo
    // rodando os pacotes em paralelo, a subida passa fácil dos 10 s padrão.
    hookTimeout: 30_000,
    testTimeout: 15_000,
  },
});
