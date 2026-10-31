/**
 * Servidor do web em produção (Railway): entrega o build do Vite com os cabeçalhos de
 * segurança e repassa /api e /socket.io (inclusive o WebSocket) para o servidor de duelos
 * pela rede privada. Assim o site e a API ficam na mesma origem e o cookie de sessão
 * pode ser HttpOnly + SameSite=Strict, sem token nenhum no JavaScript.
 *
 * Variáveis: SERVER_INTERNAL_URL (obrigatória) e PORT.
 */
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createProxyServer } from 'http-proxy-3';
import sirv from 'sirv';

const PROXIED = /^\/(api|socket\.io)(\/|$)/;

/**
 * Cria o servidor (sem escutar). `target` é a URL interna do servidor de duelos;
 * `headers`, os cabeçalhos de segurança das páginas; `apiTimeoutMs`, o prazo de cada chamada à API.
 */
export function createWebServer({ distDir, target, headers, apiTimeoutMs = 15_000 }) {
  const proxy = createProxyServer({ target, xfwd: true });
  proxy.on('error', (err, _req, res) => {
    console.error(JSON.stringify({ level: 'error', msg: 'proxy', error: err.message }));
    // No upgrade do WebSocket, `res` é o socket cru.
    if (res && 'writeHead' in res && !res.headersSent) {
      res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Servidor de duelos indisponível.');
    } else res?.destroy?.();
  });

  const assets = sirv(distDir, {
    single: true,
    etag: true,
    setHeaders(res, path) {
      for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
      // Arquivos com hash no nome podem ficar em cache para sempre; o index.html não.
      res.setHeader('Cache-Control', path.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache');
    },
  });

  const server = createServer((req, res) => {
    // A API tem prazo: se o server não responder, o jogador vê erro em vez de carregar para sempre.
    // O /socket.io fica sem prazo (o long-polling segura o pedido aberto de propósito).
    if (req.url?.startsWith('/api')) return proxy.web(req, res, { proxyTimeout: apiTimeoutMs });
    if (PROXIED.test(req.url ?? '')) return proxy.web(req, res);
    assets(req, res, () => {
      res.writeHead(404).end();
    });
  });
  server.on('upgrade', (req, socket, head) => {
    if (PROXIED.test(req.url ?? '')) proxy.ws(req, socket, head);
    else socket.destroy();
  });
  return server;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const target = process.env.SERVER_INTERNAL_URL;
  if (!target) {
    console.error('SERVER_INTERNAL_URL é obrigatória (URL privada do servidor de duelos, ex.: http://server.railway.internal:8080).');
    process.exit(1);
  }
  const distDir = join(dirname(fileURLToPath(import.meta.url)), 'dist');
  const headers = JSON.parse(readFileSync(join(distDir, '.headers.json'), 'utf8'));
  const port = Number(process.env.PORT ?? 4173);
  createWebServer({ distDir, target, headers }).listen(port, '0.0.0.0', () => {
    console.log(JSON.stringify({ level: 'log', msg: `web ouvindo na porta ${port}, API em ${target}` }));
  });
}
