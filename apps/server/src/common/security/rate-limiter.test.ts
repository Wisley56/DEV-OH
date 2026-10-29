import { describe, expect, it } from 'vitest';
import { clientIp } from './client-ip.js';
import { ConnectionCounter, RateLimiter } from './rate-limiter.js';

describe('RateLimiter', () => {
  const rule = { capacity: 3, perSec: 1 };

  it('aceita a rajada, barra o excesso e recarrega com o tempo', () => {
    let now = 0;
    const rl = new RateLimiter(() => now);
    expect([1, 2, 3, 4].map(() => rl.take('k', rule))).toEqual([true, true, true, false]);
    now += 1000;
    expect(rl.take('k', rule)).toBe(true);
    expect(rl.take('k', rule)).toBe(false);
    expect(rl.take('outra', rule)).toBe(true);
  });

  it('esquece só os baldes que voltaram a encher', () => {
    let now = 0;
    const rl = new RateLimiter(() => now);
    rl.take('a', rule);
    rl.take('b', rule);
    rl.take('b', rule);
    rl.take('b', rule);
    now += 1000;
    expect(rl.sweep()).toBe(1);
    expect(rl.size).toBe(1);
    now += 2000;
    expect(rl.sweep()).toBe(1);
    expect(rl.size).toBe(0);
  });
});

describe('ConnectionCounter', () => {
  it('limita conexões simultâneas por IP', () => {
    const c = new ConnectionCounter();
    expect(c.acquire('1.1.1.1', 2)).toBe(true);
    expect(c.acquire('1.1.1.1', 2)).toBe(true);
    expect(c.acquire('1.1.1.1', 2)).toBe(false);
    expect(c.acquire('2.2.2.2', 2)).toBe(true);
    c.release('1.1.1.1');
    expect(c.acquire('1.1.1.1', 2)).toBe(true);
  });
});

describe('clientIp', () => {
  const hs = { address: '10.0.0.1', headers: { 'x-forwarded-for': '203.0.113.9, 10.0.0.1' } };

  it('usa o x-forwarded-for só atrás de proxy confiável', () => {
    expect(clientIp(hs, true)).toBe('203.0.113.9');
    expect(clientIp(hs, false)).toBe('10.0.0.1');
    expect(clientIp({ address: '10.0.0.1', headers: {} }, true)).toBe('10.0.0.1');
  });
});
