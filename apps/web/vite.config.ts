/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defaultClientConditions, defineConfig } from 'vite';
import { securityHeaders } from './security-headers.ts';

/** Servidor de duelos em dev: o Vite repassa /api e /socket.io para ele (mesma origem, como em produção). */
const server = process.env.SERVER_INTERNAL_URL ?? 'http://localhost:3001';

export default defineConfig({
  plugins: [react(), securityHeaders()],
  resolve: {
    // Pacotes @devoh/* expõem o código-fonte na condição "source": HMR direto no engine, sem build.
    conditions: ['source', ...defaultClientConditions],
  },
  server: {
    proxy: {
      '/api': { target: server, xfwd: true },
      '/socket.io': {
        target: server,
        ws: true,
        xfwd: true,
        // Aba fechada no meio do WebSocket é normal: não polui o terminal com ECONNRESET.
        configure: (proxy) =>
          proxy.on('error', (err: NodeJS.ErrnoException) => void (/ECONN(RESET|ABORTED)/.test(err.code ?? '') || console.error(err))),
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Os testes de navegador (Playwright) rodam com npm run e2e.
    exclude: ['e2e/**', 'node_modules/**'],
  },
});
