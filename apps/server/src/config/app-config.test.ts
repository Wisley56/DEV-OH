import { describe, expect, it } from 'vitest';
import { AppConfig, TURNSTILE_TEST_KEYS } from './app-config.js';

/** Todas as variáveis que a produção exige (Railway). */
const PROD = {
  NODE_ENV: 'production',
  CORS_ORIGIN: 'https://web.example.com',
  DATABASE_URL: 'postgresql://u:p@postgres.railway.internal:5432/railway',
  DB_POOL_MAX: '10',
  SESSION_TTL_DAYS: '30',
  TRUST_PROXY_HOPS: '2',
  TURNSTILE_SITE_KEY: 'site',
  TURNSTILE_SECRET_KEY: 'secret',
};

describe('AppConfig', () => {
  it('libera qualquer origem fora de produção', () => {
    const c = new AppConfig({});
    expect(c.corsOrigin).toBe(true);
    expect(c.allowsOrigin(undefined)).toBe(true);
  });

  it('em produção exige CORS_ORIGIN explícito e sem "*"', () => {
    expect(() => new AppConfig({ ...PROD, CORS_ORIGIN: undefined })).toThrow('CORS_ORIGIN');
    expect(() => new AppConfig({ ...PROD, CORS_ORIGIN: '*' })).toThrow('CORS_ORIGIN');
  });

  it('aceita só as origens da lista', () => {
    const c = new AppConfig({ ...PROD, CORS_ORIGIN: 'https://web.example.com/, https://outro.example.com' });
    expect(c.allowsOrigin('https://web.example.com')).toBe(true);
    expect(c.allowsOrigin('https://outro.example.com')).toBe(true);
    expect(c.allowsOrigin('https://malicioso.example.com')).toBe(false);
    expect(c.allowsOrigin(undefined)).toBe(false);
  });

  it('lê limites e proxy do ambiente', () => {
    const c = new AppConfig({ TRUST_PROXY_HOPS: '2', RATE_ACTION_PER_SEC: '4', MAX_CONN_PER_IP: '3' });
    expect(c.trustProxyHops).toBe(2);
    expect(c.rates.action).toEqual({ capacity: 12, perSec: 4 });
    expect(c.maxConnPerIp).toBe(3);
  });

  it('em produção sobe com todas as variáveis do Railway', () => {
    const c = new AppConfig(PROD);
    expect(c.databaseUrl).toBe(PROD.DATABASE_URL);
    expect(c.sessionTtlMs).toBe(30 * 24 * 60 * 60 * 1000);
    expect(c.turnstile).toEqual({ siteKey: 'site', secretKey: 'secret' });
  });

  it.each(['DATABASE_URL', 'DB_POOL_MAX', 'SESSION_TTL_DAYS', 'TRUST_PROXY_HOPS', 'TURNSTILE_SITE_KEY', 'TURNSTILE_SECRET_KEY'])(
    'em produção, sem %s o servidor não sobe',
    (key) => {
      expect(() => new AppConfig({ ...PROD, [key]: undefined })).toThrow(key);
    },
  );

  it('em produção recusa banco que não seja Postgres', () => {
    expect(() => new AppConfig({ ...PROD, DATABASE_URL: 'pglite://memory' })).toThrow('postgres');
  });

  it('fora de produção usa o Postgres embutido e as chaves de teste do Turnstile', () => {
    expect(new AppConfig({ NODE_ENV: 'test' }).databaseUrl).toBe('pglite://memory');
    expect(new AppConfig({ NODE_ENV: 'development' }).databaseUrl).toBe('pglite://.data/dev');
    expect(new AppConfig({}).turnstile).toEqual({ siteKey: TURNSTILE_TEST_KEYS.site, secretKey: TURNSTILE_TEST_KEYS.secret });
  });
});
