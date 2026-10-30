import { STARTER_DECKS } from '@devoh/engine';
import { EVENTS } from '@devoh/protocol';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { call, connected, nextState, openSocket, player, signUp, startServer, type TestServer } from './support.js';

/** Sobe o servidor de verdade e joga com dois clientes Socket.IO logados. */
describe('servidor de duelos (e2e)', () => {
  let server: TestServer;
  let ana: string;
  let bia: string;

  beforeAll(async () => {
    server = await startServer();
    ana = await signUp(server.url, 'ana');
    bia = await signUp(server.url, 'bia');
  });
  afterAll(() => server.close());

  it('responde o healthcheck', async () => {
    const res = await fetch(`${server.url}/health`);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('jogar online exige conta', async () => {
    expect(await connected(openSocket(server, undefined))).toBe(false);
    expect(await connected(openSocket(server, 'devoh_session=inventado'))).toBe(false);
  });

  it('rejeita payload inválido no ack', async () => {
    const a = await player(server, ana);
    expect(await call(a, EVENTS.createRoom, { deck: 'nada' })).toEqual({ ok: false, error: 'Deck inválido.' });
    expect(await call(a, EVENTS.action, { type: 'hack' })).toEqual({ ok: false, error: 'Ação inválida.' });
    expect(await call(a, EVENTS.action, { type: 'endTurn' })).toEqual({ ok: false, error: 'Nenhum duelo em andamento.' });
    a.disconnect();
  });

  it('cria, entra, joga, esconde a mão e reconecta pela conta', async () => {
    const a = await player(server, ana);
    const b = await player(server, bia);
    const created = await call(a, EVENTS.createRoom, { deck: STARTER_DECKS[0].cards });
    expect(created).toEqual({ ok: true, code: expect.any(String) });
    if (!created.ok) return;
    const code = created.code!;

    const aPlaying = nextState(a, (r) => r.status === 'playing');
    const bPlaying = nextState(b, (r) => r.status === 'playing');
    expect(await call(b, EVENTS.joinRoom, { code: code.toLowerCase(), deck: STARTER_DECKS[1].cards })).toMatchObject({ ok: true });
    const [ra, rb] = await Promise.all([aPlaying, bPlaying]);
    expect(ra.seat).toBe(0);
    expect(rb.seat).toBe(1);
    expect(ra.view!.players[0].hand).not.toBeNull();
    expect(ra.view!.players[1].hand).toBeNull();
    expect(ra.players.map((p) => p?.name)).toEqual(['ana', 'bia']);

    const active = ra.view!.active === 0 ? a : b;
    const idle = active === a ? b : a;
    expect(await call(idle, EVENTS.action, { type: 'endTurn' })).toEqual({ ok: false, error: 'Não é o seu turno.' });
    const turnPassed = nextState(idle, (r) => r.view!.turn === 2);
    expect(await call(active, EVENTS.action, { type: 'endTurn' })).toEqual({ ok: true });
    await turnPassed;

    // Queda e volta: basta a mesma conta; a Bia não consegue pegar o assento da Ana.
    const dropped = nextState(b, (r) => r.players[0]?.connected === false);
    a.disconnect();
    await dropped;
    const intruder = await player(server, await signUp(server.url, 'caio'));
    expect(await call(intruder, EVENTS.rejoinRoom, { code })).toEqual({ ok: false, error: 'Essa sala não existe mais.' });
    const a2 = await player(server, ana);
    const back = nextState(a2);
    expect(await call(a2, EVENTS.rejoinRoom, { code })).toEqual({ ok: true, code });
    expect((await back).view!.turn).toBe(2);
  });
});
