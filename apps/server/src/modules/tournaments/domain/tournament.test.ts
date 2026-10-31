import { describe, expect, it } from 'vitest';
import { knockoutPairs, planFor, roundRobin, standings, type Match } from './bracket.js';
import { Tournament } from './tournament.js';

/** Sorteio previsível: sempre o primeiro (shuffle de Fisher-Yates mantém uma ordem fixa). */
const first = () => 0;
const names = (n: number) => Array.from({ length: n }, (_, i) => `p${i + 1}`);

function tournamentOf(n: number) {
  const ids = names(n);
  const t = new Tournament('TAAAAA', { userId: ids[0], name: ids[0], deck: [], socketId: 's1' }, 0, false, 0, first);
  for (const id of ids.slice(1)) t.join({ userId: id, name: id, deck: [], socketId: `s-${id}` });
  return t;
}

/** Joga todos os duelos pendentes; `pick` decide o vencedor (0 = a, 1 = b, null = empate). */
function playPending(t: Tournament, pick: (m: Match) => 0 | 1 | null = (m) => (m.a < m.b! ? 0 : 1)) {
  for (const m of t.pending()) {
    t.begin(m.id, `R-${m.id}`);
    const w = pick(m);
    t.report(m.id, w, w === 0 ? [4000, 0] : w === 1 ? [0, 4000] : [0, 0]);
  }
}

function playAll(t: Tournament, pick?: (m: Match) => 0 | 1 | null) {
  for (let guard = 0; t.phase !== 'encerrado' && guard < 100; guard++) playPending(t, pick);
}

describe('chaveamento', () => {
  it('escolhe a primeira fase pelo número de inscritos', () => {
    expect([2, 3, 4, 5, 6, 7, 8, 9, 10].map(planFor)).toEqual([
      'final',
      'pontos',
      'pontos',
      'pontos',
      'mata-mata',
      'mata-mata',
      'mata-mata',
      'mata-mata',
      'mata-mata',
    ]);
  });

  it('mata-mata com número ímpar dá folga a um', () => {
    const pairs = knockoutPairs(names(7), first);
    expect(pairs).toHaveLength(4);
    expect(pairs.filter(([, b]) => b === null)).toHaveLength(1);
    expect(new Set(pairs.flat().filter(Boolean)).size).toBe(7);
  });

  it.each([3, 4, 5])('todos contra todos com %i: cada par se enfrenta uma vez, ninguém duas vezes na rodada', (n) => {
    const rounds = roundRobin(names(n));
    const pairs = rounds.flat().map(([a, b]) => [a, b].sort().join('-'));
    expect(pairs).toHaveLength((n * (n - 1)) / 2);
    expect(new Set(pairs).size).toBe(pairs.length);
    for (const r of rounds) expect(new Set(r.flat()).size).toBe(r.length * 2);
  });

  it('desempata por confronto direto, depois saldo de LP e por fim o sorteio', () => {
    const m = (a: string, b: string, winner: 'a' | 'b' | 'draw', lp: [number, number]): Match => ({
      id: `${a}${b}`,
      stage: 'pontos',
      round: 1,
      a,
      b,
      status: 'fim',
      winner,
      lp,
      wo: false,
      roomCode: null,
    });
    // A e B com 3 pontos; B venceu A no confronto direto, mesmo com saldo pior.
    const ms = [m('A', 'B', 'b', [100, 200]), m('A', 'C', 'a', [8000, 0]), m('B', 'C', 'draw', [0, 0]), m('C', 'D', 'draw', [0, 0])];
    const order = (id: string) => ({ A: 0, B: 1, C: 2, D: 3 })[id]!;
    expect(standings(['A', 'B', 'C', 'D'], ms, order, () => false).map((s) => s.userId)).toEqual(['B', 'A', 'C', 'D']);
    // Quem saiu fica no fim.
    expect(standings(['A', 'B', 'C', 'D'], ms, order, (id) => id === 'B').map((s) => s.userId)).toEqual(['A', 'C', 'D', 'B']);
  });
});

describe('Tournament', () => {
  it('recusa iniciar com 1 inscrito, entrar com o torneio cheio ou depois de começar', () => {
    const solo = tournamentOf(1);
    expect(() => solo.start('p1')).toThrow('pelo menos 2');
    const full = tournamentOf(10);
    expect(() => full.join({ userId: 'x', name: 'x', deck: [], socketId: null })).toThrow('10 jogadores');
    expect(() => full.start('p2')).toThrow('Só quem criou');
    full.start('p1');
    expect(() => full.join({ userId: 'y', name: 'y', deck: [], socketId: null })).toThrow('já começou');
  });

  it('anfitrião que sai da inscrição passa o posto para o próximo', () => {
    const t = tournamentOf(3);
    t.leave('p1');
    expect(t.hostUserId).toBe('p2');
    expect(t.entrants).toHaveLength(2);
  });

  it('com 2 inscritos é só a final', () => {
    const t = tournamentOf(2);
    t.start('p1');
    expect(t.phase).toBe('final');
    playAll(t);
    expect(t.podium).toEqual(['p1', 'p2', null]);
  });

  it.each([
    [3, 3, 0],
    [4, 6, 0],
    [5, 10, 0],
    [6, 3, 3],
    [7, 6, 4],
    [8, 6, 4],
    [9, 10, 5],
    [10, 10, 5],
  ])('com %i inscritos: %i duelos na fase de pontos, %i no mata-mata (contando folga)', (n, points, knockout) => {
    const t = tournamentOf(n);
    t.start('p1');
    playAll(t);
    expect(t.phase).toBe('encerrado');
    expect(t.matches.filter((m) => m.stage === 'pontos')).toHaveLength(points);
    expect(t.matches.filter((m) => m.stage === 'mata-mata')).toHaveLength(knockout);
    expect(t.matches.filter((m) => m.stage === 'final')).toHaveLength(1);
    expect(t.podium.every(Boolean)).toBe(true);
    // Só o pódio continua "ativo"; o resto foi eliminado.
    expect(
      t.entrants
        .filter((e) => e.status === 'ativo')
        .map((e) => e.userId)
        .sort(),
    ).toEqual([...t.podium].sort());
  });

  it('pódio: final entre os 2 melhores dos pontos e bronze para o 3º', () => {
    const t = tournamentOf(4);
    t.start('p1');
    // Menor id sempre vence: p1 9 pts, p2 6, p3 3, p4 0. Na final, p2 surpreende.
    while (t.phase === 'pontos') playPending(t);
    expect(t.phase).toBe('final');
    playPending(t, () => 1);
    expect(t.podium).toEqual(['p2', 'p1', 'p3']);
    expect(t.entrant('p4')!.status).toBe('eliminado');
  });

  it('empate no mata-mata e na final joga de novo; na fase de pontos vale 1 ponto', () => {
    const t = tournamentOf(2);
    t.start('p1');
    playPending(t, () => null);
    expect(t.phase).toBe('final');
    expect(t.matches).toHaveLength(2);
    playPending(t, () => 1);
    expect(t.podium).toEqual(['p2', 'p1', null]);

    const pts = tournamentOf(3);
    pts.start('p1');
    playPending(pts, () => null);
    expect(pts.table().every((s) => s.points === (s.draws ? 1 : 0))).toBe(true);
  });

  it('quem sai perde os duelos que faltam por W.O. e o torneio segue', () => {
    const t = tournamentOf(3);
    t.start('p1');
    const [m] = t.pending();
    t.begin(m.id, 'R1');
    const out = m.b === 'p3' || m.a === 'p3' ? null : 'p3';
    // p3 sai: o duelo em andamento dele (se houver) volta para o serviço encerrar.
    const active = t.leave('p3');
    expect(active === null).toBe(out === 'p3');
    if (active) t.report(active.id, active.a === 'p3' ? 1 : 0, [4000, 0]);
    playAll(t);
    expect(t.phase).toBe('encerrado');
    expect(t.matches.filter((x) => x.wo).length).toBeGreaterThan(0);
    expect(t.entrant('p3')!.status).toBe('saiu');
    expect(t.podium.slice(0, 2)).not.toContain('p3');
  });
});
