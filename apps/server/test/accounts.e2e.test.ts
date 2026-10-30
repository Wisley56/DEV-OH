import { STARTER_DECKS } from '@devoh/engine';
import { MAX_DECKS, type DeckPayload } from '@devoh/protocol';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { TOO_MANY } from '../src/common/security/throttle.js';
import { post, sessionCookie, signUp, startServer, type TestServer } from './support.js';

const SITE = 'http://site.test';

/** Cadastro, login, cookie de sessão, origem e decks por conta (servidor de verdade). */
describe('contas e decks (e2e)', () => {
  let server: TestServer;
  let url: string;

  beforeAll(async () => {
    server = await startServer({ CORS_ORIGIN: SITE, RATE_AUTH_PER_MIN: '20' });
    url = server.url;
  });
  afterAll(() => server.close());

  const api = (path: string, init: RequestInit & { cookie?: string } = {}) =>
    fetch(`${url}/api${path}`, {
      ...init,
      headers: { 'content-type': 'application/json', origin: SITE, ...(init.cookie && { cookie: init.cookie }) },
    });
  const deck = (id: string, name = 'Meu deck'): DeckPayload => ({ id, name, description: '', cards: STARTER_DECKS[0].cards });

  it('cadastro devolve a conta e o cookie HttpOnly, nunca o token no corpo', async () => {
    const res = await post(
      url,
      '/auth/register',
      { username: 'Ana_1', displayName: '  Ana  ', password: 'senha-forte-1', turnstileToken: 'ok' },
      { origin: SITE },
    );
    expect(res.status).toBe(201);
    const setCookie = res.headers.get('set-cookie')!;
    expect(setCookie).toMatch(/^devoh_session=[\w-]+;/);
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/SameSite=Strict/i);
    expect(res.headers.get('cache-control')).toBe('no-store');
    const body = await res.text();
    expect(JSON.parse(body)).toEqual({ username: 'ana_1', displayName: 'Ana', elo: 1000, wins: 0, losses: 0, draws: 0 });
    expect(body).not.toContain(sessionCookie(res).split('=')[1]);

    const me = await api('/auth/me', { cookie: sessionCookie(res) });
    expect(await me.json()).toMatchObject({ username: 'ana_1' });
    const guest = await api('/auth/me');
    expect(guest.status).toBe(200);
    expect(await guest.json()).toBeNull();
  });

  it('recusa usuário repetido, senha curta e cadastro sem verificação', async () => {
    const register = (body: object) => post(url, '/auth/register', { displayName: 'X', turnstileToken: 'ok', ...body }, { origin: SITE });
    const dup = await register({ username: 'ana_1', password: 'senha-forte-1' });
    expect(dup.status).toBe(409);
    expect(await dup.json()).toEqual({ statusCode: 409, message: 'Esse usuário já existe. Escolha outro.' });
    expect((await register({ username: 'curta', password: '123' })).status).toBe(400);
    expect((await register({ username: 'robo', password: 'senha-forte-1', turnstileToken: '' })).status).toBe(400);
  });

  it('login, logout e senha errada com mensagem genérica', async () => {
    const wrong = await post(url, '/auth/login', { username: 'ana_1', password: 'errada-123' }, { origin: SITE });
    expect(wrong.status).toBe(401);
    expect(await wrong.json()).toEqual({ statusCode: 401, message: 'Usuário ou senha inválidos.' });
    const ghost = await post(url, '/auth/login', { username: 'ninguem', password: 'errada-123' }, { origin: SITE });
    expect(await ghost.json()).toEqual({ statusCode: 401, message: 'Usuário ou senha inválidos.' });

    const ok = await post(url, '/auth/login', { username: 'ANA_1', password: 'senha-forte-1' }, { origin: SITE });
    expect(ok.status).toBe(200);
    const cookie = sessionCookie(ok);
    expect((await api('/auth/logout', { method: 'POST', cookie })).status).toBe(204);
    expect(await (await api('/auth/me', { cookie })).json()).toBeNull();
  });

  it('recusa pedido que altera dados vindo de outra origem', async () => {
    const res = await post(url, '/auth/login', { username: 'ana_1', password: 'senha-forte-1' }, { origin: 'http://evil.test' });
    expect(res.status).toBe(403);
    expect((await post(url, '/auth/login', { username: 'ana_1', password: 'senha-forte-1' })).status).toBe(403);
  });

  it('decks: só o dono vê e mexe, com validação e importação', async () => {
    const ana = await signUp(url, 'ana_decks', SITE);
    const bia = await signUp(url, 'bia_decks', SITE);
    expect((await api('/decks')).status).toBe(401);

    expect((await api('/decks/d1', { method: 'PUT', cookie: ana, body: JSON.stringify(deck('d1')) })).status).toBe(204);
    expect((await api('/decks/d1', { method: 'PUT', cookie: ana, body: JSON.stringify(deck('d1', 'Renomeado')) })).status).toBe(204);
    const bad = await api('/decks/d2', { method: 'PUT', cookie: ana, body: JSON.stringify({ ...deck('d2'), cards: ['qa'] }) });
    expect(bad.status).toBe(400);
    expect((await api('/decks/d9', { method: 'PUT', cookie: ana, body: JSON.stringify(deck('d1')) })).status).toBe(400);
    expect(await (await api('/decks', { cookie: ana })).json()).toEqual([deck('d1', 'Renomeado')]);
    expect(await (await api('/decks', { cookie: bia })).json()).toEqual([]);
    expect((await api('/decks/d1', { method: 'DELETE', cookie: bia })).status).toBe(404);

    const imported = await api('/decks/import', {
      method: 'POST',
      cookie: bia,
      body: JSON.stringify([deck('a'), deck('b'), { ...deck('c'), cards: ['qa'] }]),
    });
    expect(await imported.json()).toEqual({ imported: 2 });
    expect(((await (await api('/decks', { cookie: bia })).json()) as DeckPayload[]).map((d: DeckPayload) => d.id)).toEqual(['a', 'b']);
    const tooMany = Array.from({ length: MAX_DECKS + 1 }, (_, i) => deck(`x${i}`));
    expect((await api('/decks/import', { method: 'POST', cookie: bia, body: JSON.stringify(tooMany) })).status).toBe(400);

    expect((await api('/decks/d1', { method: 'DELETE', cookie: ana })).status).toBe(204);
    expect(await (await api('/decks', { cookie: ana })).json()).toEqual([]);
  });

  it('limita tentativas de login por IP', async () => {
    let last = 0;
    for (let i = 0; i < 25 && last !== 429; i++) {
      last = (await post(url, '/auth/login', { username: 'ana_1', password: 'errada-123' }, { origin: SITE })).status;
    }
    expect(last).toBe(429);
    const res = await post(url, '/auth/login', { username: 'ana_1', password: 'senha-forte-1' }, { origin: SITE });
    expect(await res.json()).toMatchObject({ statusCode: 429, message: TOO_MANY });
  });
});
