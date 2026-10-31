/** Elo inicial de toda conta e o fator K (quanto uma partida move a nota). */
export const ELO_START = 1000;
export const ELO_K = 32;

/**
 * Variação de Elo dos dois lados. `score` é o resultado do primeiro: 1 vitória,
 * 0,5 empate, 0 derrota. Soma zero: o que um ganha, o outro perde.
 */
export function eloDelta(a: number, b: number, score: 0 | 0.5 | 1): [number, number] {
  const expected = 1 / (1 + 10 ** ((b - a) / 400));
  const d = Math.round(ELO_K * (score - expected));
  return [d, -d];
}
