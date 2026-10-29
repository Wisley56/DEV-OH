import { defineConfig, devices } from '@playwright/test';

/**
 * Testes de ponta a ponta no navegador: sobem o servidor de duelos (porta 3101) e o
 * front em modo dev (porta 5174) com prazos curtos e limites folgados para o teste.
 * Local: usa o Chrome instalado (PW_CHANNEL=msedge para o Edge). No CI: o Chromium do Playwright.
 */
const SERVER_PORT = 3101;
const WEB_PORT = 5174;
const SERVER_URL = `http://localhost:${SERVER_PORT}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: 'retain-on-failure',
    ...devices['Desktop Chrome'],
    channel: process.env.CI ? undefined : (process.env.PW_CHANNEL ?? 'chrome'),
  },
  webServer: [
    {
      command: 'npx tsx --conditions=source src/main.ts',
      cwd: '../server',
      url: `${SERVER_URL}/health`,
      reuseExistingServer: false,
      env: {
        PORT: String(SERVER_PORT),
        TURN_TIMEOUT_MS: '20000',
        RECONNECT_TIMEOUT_MS: '3000',
        RATE_CREATE_PER_MIN: '200',
        RATE_JOIN_PER_MIN: '200',
      },
    },
    {
      command: `npx vite --port ${WEB_PORT} --strictPort`,
      url: `http://localhost:${WEB_PORT}`,
      reuseExistingServer: false,
      env: { VITE_SERVER_URL: SERVER_URL },
    },
  ],
});
