import type { Plugin } from 'vite';

/** Widget anti-robô do cadastro (Cloudflare Turnstile): script e iframe vêm daqui. */
const TURNSTILE = 'https://challenges.cloudflare.com';

/**
 * O site e o servidor de duelos ficam na mesma origem (o `server.mjs` repassa `/api` e
 * `/socket.io`), então `connect-src 'self'` cobre o HTTP e o WebSocket.
 */
export function contentSecurityPolicy() {
  return [
    "default-src 'self'",
    `script-src 'self' ${TURNSTILE}`,
    // Os componentes usam style={{...}} (cores das cartas, posições de animação).
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    `frame-src ${TURNSTILE}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
}

/** Cabeçalhos de segurança de toda página servida pelo web. */
export function pageHeaders(): Record<string, string> {
  return {
    'Content-Security-Policy': contentSecurityPolicy(),
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Cross-Origin-Opener-Policy': 'same-origin',
  };
}

/**
 * Gera o `.headers.json` no build: o `server.mjs` aplica esses cabeçalhos em produção
 * (Railway). Arquivo com ponto no nome: o `sirv` não o serve.
 */
export function securityHeaders(): Plugin {
  return {
    name: 'devoh-security-headers',
    apply: 'build',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: '.headers.json', source: `${JSON.stringify(pageHeaders(), null, 2)}\n` });
    },
  };
}
