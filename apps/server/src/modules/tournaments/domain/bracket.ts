import { KNOCKOUT_FROM, POINTS } from '@devoh/protocol';

/** Regras puras do chaveamento: fases, pares, rodadas e classificação. */

export type Stage = 'mata-mata' | 'pontos' | 'final';

/** Sorteio: inteiro em [0, max). */
export type Rand = (max: number) => number;

/** Duelo do torneio. `b` null = folga. `winner` é o lado ('a' | 'b') ou 'draw'. */
export interface Match {
  id: string;
  stage: Stage;
  /** Rodada dentro da fase (a partir de 1). */
  round: number;
  a: string;
  b: string | null;
  status: 'pendente' | 'jogando' | 'fim';
  winner: 'a' | 'b' | 'draw' | null;
  lp: [number, number] | null;
  /** Decidido sem duelo: alguém saiu do torneio. */
  wo: boolean;
  /** Sala onde o duelo acontece (quando começa). */
  roomCode: string | null;
}

export interface Standing {
  userId: string;
  points: number;
  wins: number;
  draws: number;
  losses: number;
  lpBalance: number;
}

/** Primeira fase pelo número de inscritos: 2 vão direto à final; 6 ou mais começam no mata-mata. */
export function planFor(n: number): Stage {
  if (n <= 2) return 'final';
  return n >= KNOCKOUT_FROM ? 'mata-mata' : 'pontos';
}

export function shuffle<T>(xs: readonly T[], rand: Rand): T[] {
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Pares do mata-mata em ordem sorteada; com número ímpar, o último sorteado tem folga. */
export function knockoutPairs(ids: readonly string[], rand: Rand): [string, string | null][] {
  const order = shuffle(ids, rand);
  const pairs: [string, string | null][] = [];
  for (let i = 0; i < order.length; i += 2) pairs.push([order[i], order[i + 1] ?? null]);
  return pairs;
}

/**
 * Todos contra todos pelo método do círculo: o primeiro fica parado e os outros giram.
 * Com número ímpar, quem cai com a "folga" descansa naquela rodada.
 */
export function roundRobin(ids: readonly string[]): [string, string][][] {
  const ring: (string | null)[] = [...ids];
  if (ring.length % 2) ring.push(null);
  const n = ring.length;
  const rounds: [string, string][][] = [];
  for (let r = 0; r < n - 1; r++) {
    const round: [string, string][] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = ring[i];
      const b = ring[n - 1 - i];
      if (a && b) round.push([a, b]);
    }
    rounds.push(round);
    ring.splice(1, 0, ring.pop()!);
  }
  return rounds;
}

/** Pontos de `id` num duelo encerrado (null se não jogou nele). */
function pointsIn(m: Match, id: string): number | null {
  const side = m.a === id ? 'a' : m.b === id ? 'b' : null;
  if (!side || m.status !== 'fim') return null;
  if (m.winner === 'draw') return POINTS.draw;
  return m.winner === side ? POINTS.win : POINTS.loss;
}

/**
 * Classificação da fase de pontos. Desempate: confronto direto entre os empatados, saldo de
 * LP e, por fim, o sorteio feito no início (`order`). Quem saiu do torneio fica no fim.
 */
export function standings(ids: readonly string[], matches: readonly Match[], order: (id: string) => number, left: (id: string) => boolean) {
  const table = new Map<string, Standing>(ids.map((id) => [id, { userId: id, points: 0, wins: 0, draws: 0, losses: 0, lpBalance: 0 }]));
  for (const m of matches) {
    if (m.status !== 'fim' || !m.b) continue;
    for (const [id, side] of [
      [m.a, 0],
      [m.b, 1],
    ] as const) {
      const s = table.get(id);
      const pts = pointsIn(m, id);
      if (!s || pts === null) continue;
      s.points += pts;
      if (pts === POINTS.win) s.wins++;
      else if (pts === POINTS.draw) s.draws++;
      else s.losses++;
      if (m.lp) s.lpBalance += m.lp[side] - m.lp[1 - side];
    }
  }
  const rows = [...table.values()];
  /** Pontos de `id` só nos duelos contra outros do mesmo grupo de empatados. */
  const headToHead = (id: string) => {
    const tied = new Set(rows.filter((r) => r.points === table.get(id)!.points && left(r.userId) === left(id)).map((r) => r.userId));
    let pts = 0;
    for (const m of matches) {
      const opp = m.a === id ? m.b : m.b === id ? m.a : null;
      if (opp && opp !== id && tied.has(opp)) pts += pointsIn(m, id) ?? 0;
    }
    return pts;
  };
  const h2h = new Map(rows.map((r) => [r.userId, headToHead(r.userId)]));
  return rows.sort(
    (x, y) =>
      Number(left(x.userId)) - Number(left(y.userId)) ||
      y.points - x.points ||
      h2h.get(y.userId)! - h2h.get(x.userId)! ||
      y.lpBalance - x.lpBalance ||
      order(x.userId) - order(y.userId),
  );
}

/** Lado vencedor e perdedor de um duelo decidido. */
export function decided(m: Match): { winner: string; loser: string | null } | null {
  if (m.status !== 'fim' || m.winner === null || m.winner === 'draw') return null;
  return m.winner === 'a' ? { winner: m.a, loser: m.b } : { winner: m.b!, loser: m.a };
}
