import { STARTER_DECKS } from '@devoh/engine';
import { EVENTS, type OpenRoom, type RankingEntry, type TournamentState } from '@devoh/protocol';
import type { Socket } from 'socket.io-client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { call, player, signUp, startServer, type TestServer } from './support.js';

const deck = STARTER_DECKS[0].cards;

const tournamentState = (s: Socket, pred: (t: TournamentState) => boolean) =>
  new Promise<TournamentState>((resolve) => {
    const on = (t: TournamentState) => {
      if (!pred(t)) return;
      s.off(EVENTS.tournamentState, on);
      resolve(t);
    };
    s.on(EVENTS.tournamentState, on);
  });

/**
 * Joga sozinho: em cada duelo da conta, quem tem o nome "maior" desiste. Assim o resultado
 * é previsível (o menor nome sempre vence).
 */
function autoplay(s: Socket, me: string) {
  const done = new Set<string>();
  s.on(EVENTS.tournamentState, (t: TournamentState) => {
    for (const m of t.rounds.flatMap((r) => r.matches)) {
      if (!m.mine || m.status !== 'jogando' || done.has(m.id)) continue;
      const opp = m.a === me ? m.b! : m.a;
      if (me < opp) continue;
      done.add(m.id);
      s.emit(EVENTS.action, { type: 'surrender' }, () => {});
    }
  });
}

/** Torneio de verdade: contas, salas de duelo, W.O. por desistência e ranking. */
describe('torneio (e2e)', () => {
  let server: TestServer;
  const cookies: Record<string, string> = {};
  const users = ['ana', 'bia', 'caio', 'davi', 'edu', 'fabi', 'gil'];

  beforeAll(async () => {
    // Todo mundo vem do mesmo IP aqui: libera as entradas e criações (por IP) do teste.
    server = await startServer({ RATE_JOIN_PER_MIN: '100', RATE_CREATE_PER_MIN: '100', RATE_AUTH_PER_MIN: '100' });
    for (const u of users) cookies[u] = await signUp(server.url, u);
  });
  afterAll(() => server.close());

  const get = async <T>(path: string) => (await fetch(`${server.url}/api${path}`).then((r) => r.json())) as T;

  async function enter(names: string[], isPrivate = false) {
    const sockets = await Promise.all(names.map((n) => player(server, cookies[n])));
    const created = await call(sockets[0], EVENTS.createTournament, { deck, private: isPrivate });
    if (!created.ok) throw new Error(created.error);
    const code = created.code!;
    for (const s of sockets.slice(1)) expect(await call(s, EVENTS.joinTournament, { code, deck })).toEqual({ ok: true, code });
    return { sockets, code };
  }

  it('3 contas: inscrição na lista do lobby, fase de pontos, final e Elo de cada duelo', async () => {
    const { sockets, code } = await enter(['ana', 'bia', 'caio']);
    const list = await get<OpenRoom[]>('/rooms');
    expect(list.find((r) => r.code === code)).toMatchObject({ mode: 'torneio', host: 'ana', players: 3, max: 10 });
    expect(await call(sockets[1], EVENTS.startTournament)).toEqual({ ok: false, error: 'Só quem criou o torneio pode iniciar.' });

    sockets.forEach((s, i) => autoplay(s, ['ana', 'bia', 'caio'][i]));
    const over = Promise.all(sockets.map((s) => tournamentState(s, (t) => t.phase === 'encerrado')));
    expect(await call(sockets[0], EVENTS.startTournament)).toEqual({ ok: true });
    const [final] = await over;

    expect(final.podium).toEqual(['ana', 'bia', 'caio']);
    expect(final.standings.map((s) => [s.name, s.points])).toEqual([
      ['ana', 6],
      ['bia', 3],
      ['caio', 0],
    ]);
    expect(final.rounds.map((r) => r.phase)).toEqual(['pontos', 'pontos', 'pontos', 'final']);
    expect((await get<OpenRoom[]>('/rooms')).some((r) => r.code === code)).toBe(false);

    // 3 duelos de pontos + a final: 4 partidas no ranking (a Ana venceu 3).
    await new Promise((r) => setTimeout(r, 300));
    const ranking = await get<RankingEntry[]>('/ranking');
    expect(ranking.find((r) => r.username === 'ana')).toMatchObject({ wins: 3, losses: 0 });
    sockets.forEach((s) => s.disconnect());
  });

  it('6 contas passam pelo mata-mata; quem cai volta para o torneio e para o duelo', async () => {
    const names = ['bia', 'caio', 'davi', 'edu', 'fabi', 'gil'];
    const { sockets, code } = await enter(names, true);
    expect((await get<OpenRoom[]>('/rooms')).some((r) => r.code === code)).toBe(false);

    // Edu cai no meio do primeiro duelo dele e volta pela conta.
    const started = tournamentState(sockets[3], (t) => !!t.myMatch);
    expect(await call(sockets[0], EVENTS.startTournament)).toEqual({ ok: true });
    const first = await started;
    expect(first.phase).toBe('mata-mata');
    sockets[3].disconnect();
    const edu = await player(server, cookies.edu);
    const back = tournamentState(edu, (t) => t.myMatch === first.myMatch);
    expect(await call(edu, EVENTS.rejoinTournament, { code })).toEqual({ ok: true, code });
    await back;
    sockets[3] = edu;

    const over = Promise.all(sockets.map((s) => tournamentState(s, (t) => t.phase === 'encerrado')));
    sockets.forEach((s, i) => autoplay(s, names[i]));
    // O estado que já chegou não dispara de novo: um empurrão com o rejoin reenvia a todos.
    await call(sockets[0], EVENTS.rejoinTournament, { code });
    const [final] = await over;
    expect(final.rounds[0].phase).toBe('mata-mata');
    expect(final.rounds[0].matches).toHaveLength(3);
    expect(final.entrants.filter((e) => e.status === 'eliminado')).toHaveLength(3);
    expect(final.podium[0]).toBeTruthy();
    sockets.forEach((s) => s.disconnect());
  });

  it('quem sai do torneio perde os duelos que faltam por W.O.', async () => {
    const { sockets, code } = await enter(['ana', 'bia', 'caio']);
    const over = Promise.all(sockets.slice(0, 2).map((s) => tournamentState(s, (t) => t.phase === 'encerrado')));
    autoplay(sockets[0], 'ana');
    autoplay(sockets[1], 'bia');
    expect(await call(sockets[0], EVENTS.startTournament)).toEqual({ ok: true });
    sockets[2].emit(EVENTS.leaveTournament);
    const [final] = await over;
    expect(final.entrants.find((e) => e.name === 'caio')!.status).toBe('saiu');
    expect(final.podium.slice(0, 2)).toEqual(['ana', 'bia']);
    expect(code).toMatch(/^T/);
    sockets.forEach((s) => s.disconnect());
  });
});
