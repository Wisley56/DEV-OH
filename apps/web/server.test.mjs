// @vitest-environment node
import { mkdtempSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Server } from 'socket.io';
import { io } from 'socket.io-client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createWebServer } from './server.mjs';

/** O servidor do web em produção: estático com cabeçalhos + proxy de /api e /socket.io. */
describe('server.mjs', () => {
  let api;
  let web;
  let base;
  const headers = { 'Content-Security-Policy': "default-src 'self'", 'X-Frame-Options': 'DENY' };

  const listen = (srv) => new Promise((r) => srv.listen(0, '127.0.0.1', () => r(srv.address().port)));

  beforeAll(async () => {
    // Servidor de duelos de mentira: ecoa o caminho e o X-Forwarded-For, e um socket que responde "pong".
    api = createServer((req, res) => {
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ url: req.url, fwd: req.headers['x-forwarded-for'] ?? null }));
    });
    new Server(api).on('connection', (s) => s.on('ping', (ack) => ack('pong')));
    const apiPort = await listen(api);

    const dist = mkdtempSync(join(tmpdir(), 'devoh-web-'));
    writeFileSync(join(dist, 'index.html'), '<!doctype html><title>DEV-OH!</title>');
    web = createWebServer({ distDir: dist, target: `http://127.0.0.1:${apiPort}`, headers });
    base = `http://127.0.0.1:${await listen(web)}`;
  });
  afterAll(() => {
    web?.close();
    api?.close();
  });

  it('serve a SPA com os cabeçalhos de segurança (qualquer rota cai no index.html)', async () => {
    const res = await fetch(`${base}/ranking`);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('DEV-OH!');
    expect(res.headers.get('content-security-policy')).toBe(headers['Content-Security-Policy']);
    expect(res.headers.get('x-frame-options')).toBe('DENY');
  });

  it('repassa /api para o servidor de duelos com o X-Forwarded-For', async () => {
    const body = await fetch(`${base}/api/rooms?x=1`).then((r) => r.json());
    expect(body.url).toBe('/api/rooms?x=1');
    expect(body.fwd).toBeTruthy();
  });

  it('repassa o WebSocket do /socket.io', async () => {
    const s = io(base, { transports: ['websocket'], forceNew: true, reconnection: false });
    const reply = await new Promise((resolve, reject) => {
      s.on('connect', () => s.emit('ping', resolve));
      s.on('connect_error', reject);
    });
    s.disconnect();
    expect(reply).toBe('pong');
  });

  it('API que não responde vira 502 no prazo, em vez de carregar para sempre', async () => {
    // Aceita a conexão e nunca responde (como um server inalcançável pela rede privada).
    const mute = createServer(() => {});
    const mutePort = await listen(mute);
    const dist = mkdtempSync(join(tmpdir(), 'devoh-web-'));
    writeFileSync(join(dist, 'index.html'), '<!doctype html>');
    const slow = createWebServer({ distDir: dist, target: `http://127.0.0.1:${mutePort}`, headers, apiTimeoutMs: 300 });
    const res = await fetch(`http://127.0.0.1:${await listen(slow)}/api/ranking`);
    expect(res.status).toBe(502);
    slow.close();
    mute.closeAllConnections();
    mute.close();
  });
});
