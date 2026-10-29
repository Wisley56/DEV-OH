import { describe, expect, it } from 'vitest';
import { AppConfig } from './app-config.js';

describe('AppConfig', () => {
  it('libera qualquer origem fora de produção', () => {
    const c = new AppConfig({});
    expect(c.corsOrigin).toBe(true);
    expect(c.allowsOrigin(undefined)).toBe(true);
  });

  it('em produção exige CORS_ORIGIN explícito e sem "*"', () => {
    expect(() => new AppConfig({ NODE_ENV: 'production' })).toThrow('CORS_ORIGIN');
    expect(() => new AppConfig({ NODE_ENV: 'production', CORS_ORIGIN: '*' })).toThrow('CORS_ORIGIN');
  });

  it('aceita só as origens da lista', () => {
    const c = new AppConfig({ NODE_ENV: 'production', CORS_ORIGIN: 'https://web.example.com/, https://outro.example.com' });
    expect(c.allowsOrigin('https://web.example.com')).toBe(true);
    expect(c.allowsOrigin('https://outro.example.com')).toBe(true);
    expect(c.allowsOrigin('https://malicioso.example.com')).toBe(false);
    expect(c.allowsOrigin(undefined)).toBe(false);
  });

  it('lê limites e proxy do ambiente', () => {
    const c = new AppConfig({ TRUST_PROXY: 'true', RATE_ACTION_PER_SEC: '4', MAX_CONN_PER_IP: '3' });
    expect(c.trustProxy).toBe(true);
    expect(c.rates.action).toEqual({ capacity: 12, perSec: 4 });
    expect(c.maxConnPerIp).toBe(3);
  });
});
