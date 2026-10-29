/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defaultClientConditions, defineConfig, loadEnv } from 'vite';
import { securityHeaders } from './security-headers.ts';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    plugins: [react(), securityHeaders(env.VITE_SERVER_URL)],
    resolve: {
      // Pacotes @devoh/* expõem o código-fonte na condição "source": HMR direto no engine, sem build.
      conditions: ['source', ...defaultClientConditions],
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      // Os testes de navegador (Playwright) rodam com npm run e2e.
      exclude: ['e2e/**', 'node_modules/**'],
    },
  };
});
