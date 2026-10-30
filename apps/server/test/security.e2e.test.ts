import { STARTER_DECKS } from '@devoh/engine';
import { EVENTS } from '@devoh/protocol';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { TOO_MANY } from '../src/common/security/throttle.js';
import { call, connected, openSocket, signUp, startServer, type TestServer } from './support.js';

const GOOD = 'http://good.test';
const LIMITS = {
  CORS_ORIGIN: GOOD,
  RATE_CREATE_PER_MIN: '2',
  RATE_JOIN_PER_MIN: '3',
  RATE_ACTION_PER_SEC: '2',
  MAX_CONN_PER_IP: '6',
};

/** Limites de abuso com o servidor de verdade (todos os clientes saem do mesmo IP). */
describe('segurança do servidor (e2e)', () => {
  let server: TestServer;
  let url: string;
  let ana: string;
  let bia: string;

  beforeAll(async () => {
    server = await startServer(LIMITS);
    url = server.url;
    ana = await signUp(url, 'ana', GOOD);
    bia = await signUp(url, 'bia', GOOD);
  });
  afterAll(() => server.close());

  const open = (origin = GOOD, cookie = ana) => openSocket(server, cookie, origin);
  const client = async (cookie = ana) => {
    const s = open(GOOD, cookie);
    expect(await connected(s)).toBe(true);
    return s;
  };
  const deck = STARTER_DECKS[0].cards;

  it('recusa conexão de outra origem', async () => {
    expect(await connected(open('http://evil.test'))).toBe(false);
    expect(await connected(open())).toBe(true);
  });

  it('manda cabeçalhos de segurança no HTTP', async () => {
    const res = await fetch(`${url}/health`);
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('x-powered-by')).toBeNull();
    expect(await res.json()).toEqual({ ok: true });
  });

  it('limita criação de salas por IP e libera a sala anterior da conexão', async () => {
    const a = await client();
    const first = await call(a, EVENTS.createRoom, { deck });
    const second = await call(a, EVENTS.createRoom, { deck });
    expect(first.ok && second.ok).toBe(true);
    expect(await call(a, EVENTS.createRoom, { deck })).toEqual({ ok: false, error: TOO_MANY });

    // A primeira sala saiu quando a conexão criou a segunda.
    const b = await client(bia);
    const joinFirst = await call(b, EVENTS.joinRoom, { code: first.ok ? first.code : '', deck });
    expect(joinFirst).toEqual({ ok: false, error: 'Sala não encontrada. Confere o código?' });
  });

  it('barra força bruta de código de sala', async () => {
    const c = await client();
    // Já houve 1 tentativa no teste anterior: sobram 2 no balde de 3.
    for (const code of ['ZZZZ1', 'ZZZZ2']) expect(await call(c, EVENTS.joinRoom, { code, deck })).toMatchObject({ ok: false });
    expect(await call(c, EVENTS.joinRoom, { code: 'ZZZZ3', deck })).toEqual({ ok: false, error: TOO_MANY });
    expect(await call(c, EVENTS.rejoinRoom, { code: 'ZZZZ3' })).toEqual({ ok: false, error: TOO_MANY });
  });

  it('limita jogadas por conexão e derruba quem insiste', async () => {
    const d = await client();
    const acks = [];
    for (let i = 0; i < 6; i++) acks.push(await call(d, EVENTS.action, { type: 'endTurn' }));
    expect(acks.every((a) => !a.ok && a.error === 'Nenhum duelo em andamento.')).toBe(true);
    expect(await call(d, EVENTS.action, { type: 'endTurn' })).toEqual({ ok: false, error: TOO_MANY });

    const dropped = new Promise<string>((r) => d.once('disconnect', r));
    for (let i = 0; i < 12; i++) d.emit(EVENTS.action, { type: 'endTurn' }, () => {});
    expect(await dropped).toBe('io server disconnect');
  });

  it('limita conexões simultâneas por IP', async () => {
    server.sockets.forEach((s) => s.disconnect());
    await new Promise((r) => setTimeout(r, 100));
    for (let i = 0; i < 6; i++) await client();
    expect(await connected(open())).toBe(false);
  });
});
