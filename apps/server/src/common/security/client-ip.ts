import { createHash } from 'node:crypto';
import type { IncomingHttpHeaders } from 'node:http';

/**
 * IP de quem conectou. Atrás de `trustHops` proxies confiáveis, cada um acrescentou um item
 * ao fim do `x-forwarded-for`; o cliente é o item que o primeiro deles acrescentou. Itens antes
 * dele vieram do próprio cliente e podem ser falsos, por isso não contam.
 */
export function clientIp(handshake: { address: string; headers: IncomingHttpHeaders }, trustHops: number): string {
  if (trustHops > 0) {
    const fwd = handshake.headers['x-forwarded-for'];
    const list = (Array.isArray(fwd) ? fwd.join(',') : (fwd ?? ''))
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const ip = list[list.length - trustHops];
    if (ip) return ip;
  }
  return handshake.address;
}

/** Identificador do IP para log, sem guardar o IP em si. */
export const ipTag = (ip: string) => createHash('sha256').update(ip).digest('hex').slice(0, 12);
