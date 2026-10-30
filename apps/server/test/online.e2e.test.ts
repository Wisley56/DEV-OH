import { STARTER_DECKS } from '@devoh/engine';
import { EVENTS, type AccountView, type MatchHistoryEntry, type OpenRoom, type RankingEntry } from '@devoh/protocol';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { call, nextState, player, signUp, startServer, type TestServer } from './support.js';

/** Lista de salas, timer de turno, W.O. e ranking com prazos curtos (servidor de verdade). */
describe('salas abertas, timer, W.O. e ranking (e2e)', () => {
  let server: TestServer;
  let ana: string;
  let bia: string;
  const deck = STARTER_DECKS[0].cards;

  beforeAll(async () => {
    server = await startServer({ TURN_TIMEOUT_MS: '400', RECONNECT_TIMEOUT_MS: '400' });
    ana = await signUp(server.url, 'ana');
    bia = await signUp(server.url, 'bia');
  });
  afterAll(() => server.close());

  const get = async <T>(path: string, cookie?: string) =>
    (await fetch(`${server.url}/api${path}`, { headers: cookie ? { cookie } : {} }).then((r) => r.json())) as T;

  it('lista só as salas públicas que esperam oponente', async () => {
    const a = await player(server, ana);
    const b = await player(server, bia);
    const pub = await call(a, EVENTS.createRoom, { deck });
    await call(b, EVENTS.createRoom, { deck, private: true });
    const list = await get<OpenRoom[]>('/rooms');
    expect(list.map((r) => r.host)).toEqual(['ana']);
    expect(list[0].code).toBe(pub.ok ? pub.code : '');
    a.disconnect();
    b.disconnect();
  });

  it('turno estourado passa a vez sozinho; quem cai perde por W.O. e o Elo muda', async () => {
    expect(await get<RankingEntry[]>('/ranking')).toEqual([]);
    const a = await player(server, ana);
    const b = await player(server, bia);
    const created = await call(a, EVENTS.createRoom, { deck });
    const code = created.ok ? created.code! : '';
    const started = nextState(a, (r) => r.status === 'playing');
    await call(b, EVENTS.joinRoom, { code, deck });
    const first = await started;
    expect(first.turnDeadline).toBeGreaterThan(first.serverNow);

    // Ninguém joga: o servidor encerra o turno quando o prazo acaba.
    const passed = await nextState(a, (r) => !!r.view && r.view.turn > first.view!.turn);
    expect(passed.view!.active).not.toBe(first.view!.active);

    // A Bia cai: a Ana vê a contagem e, sem volta, vence por W.O.
    const gone = nextState(a, (r) => r.players[1]?.connected === false);
    b.disconnect();
    expect((await gone).players[1]?.reconnectDeadline).toBeGreaterThan(0);
    // O Elo chega logo depois do fim: escuta antes, para não perder a mensagem.
    const scoring = nextState(a, (r) => r.players[0]?.eloDelta != null);
    const end = await nextState(a, (r) => r.view?.winner !== null && r.view?.winner !== undefined);
    expect(end.view!.outcome).toEqual({ reason: 'abandon', loser: 1 });

    // O resultado vai para o ranking e a sala mostra a variação de Elo.
    const scored = await scoring;
    expect(scored.players.map((p) => p?.eloDelta)).toEqual([16, -16]);
    const ranking = await get<RankingEntry[]>('/ranking');
    expect(ranking.map((r) => [r.position, r.username, r.elo, r.wins, r.losses, r.winRate])).toEqual([
      [1, 'ana', 1016, 1, 0, 100],
      [2, 'bia', 984, 0, 1, 0],
    ]);
    expect(await get<AccountView>('/auth/me', bia)).toMatchObject({ elo: 984, losses: 1 });
    const history = await get<MatchHistoryEntry[]>('/ranking/me', bia);
    expect(history).toEqual([expect.objectContaining({ opponent: 'ana', result: 'loss', reason: 'abandon', eloDelta: -16 })]);
  });
});
