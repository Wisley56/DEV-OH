import type { Plugin } from 'vite';

/** Origens do servidor de duelos que o navegador pode chamar (HTTP do polling + WebSocket). */
function serverOrigins(serverUrl: string | undefined): string[] {
  if (!serverUrl) {
    // Build local sem VITE_SERVER_URL: o front fala com o server na porta 3001 do mesmo host.
    return ['http://localhost:3001', 'ws://localhost:3001', 'http://127.0.0.1:3001', 'ws://127.0.0.1:3001'];
  }
  const url = new URL(serverUrl);
  const ws = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return [url.origin, `${ws}//${url.host}`];
}

export function contentSecurityPolicy(serverUrl: string | undefined) {
  return [
    "default-src 'self'",
    "script-src 'self'",
    // Os componentes usam style={{...}} (cores das cartas, posições de animação).
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src 'self' ${serverOrigins(serverUrl).join(' ')}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
}

/**
 * Gera o `serve.json` no build: cabeçalhos de segurança e cache que o `serve`
 * aplica em produção (Railway). O rewrite de SPA continua vindo do `serve -s`.
 */
export function securityHeaders(serverUrl: string | undefined): Plugin {
  return {
    name: 'devoh-security-headers',
    apply: 'build',
    generateBundle() {
      const config = {
        headers: [
          {
            source: '**',
            headers: [
              { key: 'Content-Security-Policy', value: contentSecurityPolicy(serverUrl) },
              { key: 'X-Content-Type-Options', value: 'nosniff' },
              { key: 'X-Frame-Options', value: 'DENY' },
              { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
              { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
              { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
              { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
            ],
          },
          {
            // Arquivos com hash no nome: podem ficar em cache para sempre.
            source: 'assets/**',
            headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
          },
        ],
      };
      this.emitFile({ type: 'asset', fileName: 'serve.json', source: `${JSON.stringify(config, null, 2)}\n` });
    },
  };
}
