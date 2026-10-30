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
    expect(clientIp(hs, 2)).toBe('203.0.113.9');
    expect(clientIp(hs, 0)).toBe('10.0.0.1');
    expect(clientIp({ address: '10.0.0.1', headers: {} }, 2)).toBe('10.0.0.1');
  });

  const at = (fwd: string | undefined, hops: number) =>
    clientIp({ address: '10.0.0.9', headers: fwd === undefined ? {} : { 'x-forwarded-for': fwd } }, hops);

  it('sem proxy confiável, usa o IP da conexão (ignora o x-forwarded-for)', () => {
    expect(at('1.2.3.4', 0)).toBe('10.0.0.9');
  });

  it('atrás da borda do Railway e do proxy do web, pega o item que a borda acrescentou', () => {
    // O cliente mandou um x-forwarded-for falso; a borda acrescentou o IP real e o proxy do web, o da borda.
    expect(at('6.6.6.6, 200.1.2.3, 10.1.0.1', 2)).toBe('200.1.2.3');
    expect(at('200.1.2.3, 10.1.0.1', 2)).toBe('200.1.2.3');
  });

  it('cabeçalho curto demais: cai no IP da conexão', () => {
    expect(at('10.1.0.1', 2)).toBe('10.0.0.9');
    expect(at(undefined, 2)).toBe('10.0.0.9');
  });
});
