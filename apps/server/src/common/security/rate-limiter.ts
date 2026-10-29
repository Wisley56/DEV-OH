import type { RateRule } from '../../config/app-config.js';

interface Bucket {
  tokens: number;
  at: number;
  rule: RateRule;
}

/** Baldes de tokens em memória, um por chave (ex.: "create:<ip>", "action:<socket>"). */
export class RateLimiter {
  private readonly buckets = new Map<string, Bucket>();

  constructor(private readonly now: () => number = Date.now) {}

  /** Consome 1 token; `false` = limite estourado. */
  take(key: string, rule: RateRule): boolean {
    const b = this.refill(key, rule);
    if (b.tokens < 1) return false;
    b.tokens -= 1;
    return true;
  }

  /** Esquece baldes que já voltaram a encher (ninguém usando); retorna quantos saíram. */
  sweep(): number {
    let removed = 0;
    for (const [key, b] of this.buckets) {
      if (this.level(b) >= b.rule.capacity) {
        this.buckets.delete(key);
        removed++;
      }
    }
    return removed;
  }

  get size() {
    return this.buckets.size;
  }

  private level(b: Bucket) {
    return Math.min(b.rule.capacity, b.tokens + ((this.now() - b.at) / 1000) * b.rule.perSec);
  }

  private refill(key: string, rule: RateRule): Bucket {
    const b = this.buckets.get(key);
    if (!b) {
      const fresh = { tokens: rule.capacity, at: this.now(), rule };
      this.buckets.set(key, fresh);
      return fresh;
    }
    b.tokens = this.level(b);
    b.at = this.now();
    return b;
  }
}

/** Conta conexões abertas por IP. */
export class ConnectionCounter {
  private readonly open = new Map<string, number>();

  acquire(ip: string, max: number): boolean {
    const n = this.open.get(ip) ?? 0;
    if (n >= max) return false;
    this.open.set(ip, n + 1);
    return true;
  }

  release(ip: string) {
    const n = (this.open.get(ip) ?? 1) - 1;
    if (n <= 0) this.open.delete(ip);
    else this.open.set(ip, n);
  }
}
