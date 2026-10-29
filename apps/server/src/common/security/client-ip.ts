import { createHash } from 'node:crypto';
import type { IncomingHttpHeaders } from 'node:http';

/** IP de quem conectou. Atrás de proxy confiável, o primeiro item do `x-forwarded-for` é o cliente. */
export function clientIp(handshake: { address: string; headers: IncomingHttpHeaders }, trustProxy: boolean): string {
  if (trustProxy) {
    const fwd = handshake.headers['x-forwarded-for'];
    const first = (Array.isArray(fwd) ? fwd[0] : fwd)?.split(',')[0]?.trim();
    if (first) return first;
  }
  return handshake.address;
}

/** Identificador do IP para log, sem guardar o IP em si. */
export const ipTag = (ip: string) => createHash('sha256').update(ip).digest('hex').slice(0, 12);
