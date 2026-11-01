/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { createLogger, defaultClientConditions, defineConfig } from 'vite';
import { securityHeaders } from './security-headers.ts';

/** Servidor de duelos em dev: o Vite repassa /api e /socket.io para ele (mesma origem, como em produção). */
const server = process.env.SERVER_INTERNAL_URL ?? 'http://localhost:3001';

/** Conexão que o navegador fechou no meio (aba fechada, troca de página, fim do duelo): normal, não é erro. */
const CLOSED_SOCKET = /^(EPIPE|ECONNRESET|ECONNABORTED)$/;
const isClosedSocket = (err: unknown) => CLOSED_SOCKET.test((err as NodeJS.ErrnoException | undefined)?.code ?? '');

/** Logger do Vite sem os avisos de WebSocket fechado pelo navegador; os outros erros de proxy continuam. */
const logger = createLogger();
const logError = logger.error.bind(logger);
logger.error = (msg, options) => {
  if (msg.includes('ws proxy') && isClosedSocket(options?.error)) return;
  logError(msg, options);
};

export default defineConfig({
  customLogger: logger,
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
        // Aba fechada no meio do WebSocket é normal: não polui o terminal com EPIPE/ECONNRESET.
        configure: (proxy) => proxy.on('error', (err) => void (isClosedSocket(err) || console.error(err))),
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
