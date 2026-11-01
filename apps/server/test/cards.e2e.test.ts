import { STARTER_DECKS, type CustomCardInput } from '@devoh/engine';
import { EVENTS, type ApiError, type CustomCardRecord, type CustomCatalog } from '@devoh/protocol';
import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ART_STORAGE } from '../src/modules/cards/application/ports.js';
import type { MemoryArtStorage } from '../src/modules/cards/infrastructure/art-storages.js';
import { call, nextState, player, signUp, startServer, type TestServer } from './support.js';

const SITE = 'http://site.test';

const pro = (over: Partial<CustomCardInput> = {}): CustomCardInput => ({
  id: 'x_estagiaria',
  name: 'Estagiária Curiosa',
  kind: 'pro',
  rarity: 'comum',
  typeLine: 'Humano / Estagiária',
  attribute: 'LUZ',
  level: 4,
  atk: 2500,
  def: 2000,
  lore: 'Pergunta tudo. Anota tudo. Esquece tudo.',
  ...over,
});

/** Criador de cartas no servidor: rascunho, arte no armazenamento, tabela de balanceamento e catálogo. */
describe('cartas do painel (e2e)', () => {
  let server: TestServer;
  let url: string;
  let admin: string;
  let comum: string;
  let png: Buffer;

  beforeAll(async () => {
    server = await startServer({ CORS_ORIGIN: SITE, RATE_AUTH_PER_MIN: '20', DEV_ADMIN_USERNAMES: 'admin_*' });
    url = server.url;
    admin = await signUp(url, 'admin_ana', SITE);
    comum = await signUp(url, 'bia', SITE);
    png = await sharp({ create: { width: 1000, height: 800, channels: 3, background: '#3a6' } })
      .png()
      .toBuffer();
  });
  afterAll(() => server.close());

  const api = (method: string, path: string, opts: { cookie?: string; body?: unknown; raw?: Buffer; type?: string } = {}) =>
    fetch(`${url}/api${path}`, {
      method,
      headers: {
        origin: SITE,
        ...(opts.cookie && { cookie: opts.cookie }),
        ...(opts.body !== undefined && { 'content-type': 'application/json' }),
        ...(opts.raw && { 'content-type': opts.type ?? 'image/png' }),
      },
      body: opts.raw ? new Uint8Array(opts.raw) : opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  const json = async <T>(res: Response) => (await res.json()) as T;
  const catalog = async () => json<CustomCatalog>(await fetch(`${url}/api/cards/custom`));

  it('rotas do criador: 401 sem sessão e 403 para conta comum', async () => {
    expect((await api('GET', '/admin/cards')).status).toBe(401);
    expect((await api('GET', '/admin/cards', { cookie: comum })).status).toBe(403);
    expect((await api('POST', '/admin/cards', { cookie: comum, body: { input: pro() } })).status).toBe(403);
    expect((await api('PUT', '/admin/cards/x_estagiaria/art', { cookie: comum, raw: png })).status).toBe(403);
  });

  it('rascunho salva acima do orçamento; publicar sem arte e acima da tabela dá 422', async () => {
    const created = await api('POST', '/admin/cards', { cookie: admin, body: { input: pro() } });
    expect(created.status).toBe(201);
    expect(await json<CustomCardRecord>(created)).toMatchObject({ id: 'x_estagiaria', status: 'draft', version: 1, serial: null });
    expect((await api('POST', '/admin/cards', { cookie: admin, body: { input: pro() } })).status).toBe(409);
    expect((await api('POST', '/admin/cards', { cookie: admin, body: { input: { ...pro(), id: 'qa' } } })).status).toBe(400);

    const refused = await api('POST', '/admin/cards/x_estagiaria/publish', { cookie: admin });
    expect(refused.status).toBe(422);
    const err = await json<ApiError>(refused);
    expect(err.problems).toEqual(expect.arrayContaining([expect.stringContaining('teto'), 'Envie a arte da carta antes de publicar.']));
    expect((await catalog()).cards).toEqual([]);
  });

  it('upload: só imagem de verdade, até 8 MB, recodificada em WebP 720×620', async () => {
    const put = (raw: Buffer, type?: string, q = '') => api('PUT', `/admin/cards/x_estagiaria/art${q}`, { cookie: admin, raw, type });
    expect((await put(Buffer.from('oi'), 'text/plain')).status).toBe(415);
    expect((await put(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'), 'image/svg+xml')).status).toBe(415);
    expect((await put(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'))).status).toBe(400);
    expect((await put(Buffer.alloc(8 * 1024 * 1024 + 1, 1))).status).toBe(413);
    expect((await put(png, 'image/png', '?left=900&top=0&width=200&height=200')).status).toBe(400);

    const res = await put(png, 'image/png', '?left=100&top=50&width=700&height=600');
    expect(res.status).toBe(200);
    const rec = await json<CustomCardRecord>(res);
    expect(rec).toMatchObject({ artVersion: 1, version: 1 });
    const art = await api('GET', '/admin/cards/x_estagiaria/art', { cookie: admin });
    const meta = await sharp(Buffer.from(await art.arrayBuffer())).metadata();
    expect([meta.format, meta.width, meta.height]).toEqual(['webp', 720, 620]);

    // A troca apaga a versão anterior do armazenamento.
    expect((await put(png)).status).toBe(200);
    const storage = server.app.get<MemoryArtStorage>(ART_STORAGE);
    expect([...storage.files.keys()]).toEqual(['cards/x_estagiaria/v2.webp']);
  });

  it('versão velha dá 409; dentro da tabela, publica e entra no catálogo com ETag', async () => {
    const save = (version: number, input = pro({ atk: 1900, def: 1500 })) =>
      api('PUT', '/admin/cards/x_estagiaria', { cookie: admin, body: { input, version } });
    expect((await save(1)).status).toBe(200);
    expect((await save(1)).status).toBe(409);

    const published = await api('POST', '/admin/cards/x_estagiaria/publish', { cookie: admin });
    expect(published.status).toBe(200);
    expect(await json<CustomCardRecord>(published)).toMatchObject({ status: 'published', serial: 1 });

    const res = await fetch(`${url}/api/cards/custom`);
    const etag = res.headers.get('etag')!;
    const body = await json<CustomCatalog>(res);
    expect(body.cards).toEqual([{ input: pro({ atk: 1900, def: 1500 }), serial: 1, artVersion: 2, status: 'published' }]);
    expect(etag).toBe(`"${body.revision}"`);
    expect((await fetch(`${url}/api/cards/custom`, { headers: { 'if-none-match': etag } })).status).toBe(304);

    const art = await fetch(`${url}/api/cards/x_estagiaria/art?v=2`);
    expect(art.headers.get('content-type')).toBe('image/webp');
    expect(art.headers.get('cache-control')).toContain('immutable');
    expect((await fetch(`${url}/api/cards/x_nada/art?v=1`)).status).toBe(404);
  });

  it('publicada: regras travadas, nome editável; o deck com ela entra na sala', async () => {
    const current = await json<CustomCardRecord>(await api('GET', '/admin/cards/x_estagiaria', { cookie: admin }));
    const locked = await api('PUT', '/admin/cards/x_estagiaria', {
      cookie: admin,
      body: { input: { ...current.input, atk: 1800 }, version: current.version },
    });
    expect(locked.status).toBe(400);
    expect((await json<ApiError>(locked)).message).toContain('duplique');

    const before = (await catalog()).revision;
    const renamed = await api('PUT', '/admin/cards/x_estagiaria', {
      cookie: admin,
      body: { input: { ...current.input, name: 'Estagiária Destemida' }, version: current.version },
    });
    expect(renamed.status).toBe(200);
    const after = await catalog();
    expect(after.revision).not.toBe(before);
    expect(after.cards[0]!.input.name).toBe('Estagiária Destemida');

    const deck = [...STARTER_DECKS[0].cards.slice(1), 'x_estagiaria'];
    const s = await player(server, comum, SITE);
    const state = nextState(s);
    const ack = await call(s, EVENTS.createRoom, { deck });
    expect(ack.ok).toBe(true);
    expect((await state).catalogRevision).toBe(after.revision);
    s.disconnect();
  });

  it('aposentar tira dos decks novos e mantém desenhável; publicada não se apaga', async () => {
    expect((await api('DELETE', '/admin/cards/x_estagiaria', { cookie: admin })).status).toBe(400);
    expect((await api('DELETE', '/admin/cards/x_estagiaria/art', { cookie: admin })).status).toBe(400);
    expect((await api('POST', '/admin/cards/x_estagiaria/retire', { cookie: admin })).status).toBe(200);
    expect((await catalog()).cards[0]).toMatchObject({ status: 'retired' });

    const s = await player(server, comum, SITE);
    const ack = await call(s, EVENTS.createRoom, { deck: [...STARTER_DECKS[0].cards.slice(1), 'x_estagiaria'] });
    expect(ack).toMatchObject({ ok: false, error: expect.stringContaining('aposentad') });
    s.disconnect();

    const restored = await api('POST', '/admin/cards/x_estagiaria/restore', { cookie: admin });
    expect(await json<CustomCardRecord>(restored)).toMatchObject({ status: 'published', serial: 1 });
  });

  it('rascunho se apaga com a arte; bucket fora do ar dá 503 no upload', async () => {
    await api('POST', '/admin/cards', { cookie: admin, body: { input: pro({ id: 'x_rascunho' }) } });
    expect((await api('PUT', '/admin/cards/x_rascunho/art', { cookie: admin, raw: png })).status).toBe(200);
    expect((await api('DELETE', '/admin/cards/x_rascunho', { cookie: admin })).status).toBe(204);
    const storage = server.app.get<MemoryArtStorage>(ART_STORAGE);
    expect([...storage.files.keys()].some((k) => k.includes('x_rascunho'))).toBe(false);

    await api('POST', '/admin/cards', { cookie: admin, body: { input: pro({ id: 'x_offline' }) } });
    storage.down = true;
    try {
      expect((await api('PUT', '/admin/cards/x_offline/art', { cookie: admin, raw: png })).status).toBe(503);
    } finally {
      storage.down = false;
    }
    const list = await json<CustomCardRecord[]>(await api('GET', '/admin/cards', { cookie: admin }));
    expect(list.map((c) => [c.id, c.status, c.artVersion])).toEqual([
      ['x_estagiaria', 'published', 2],
      ['x_offline', 'draft', 0],
    ]);
  });
});
