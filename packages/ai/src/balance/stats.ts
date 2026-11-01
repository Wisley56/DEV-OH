/** Estatística dos relatórios de balanceamento: win rate, intervalo de confiança e veredito. */

export interface Tally {
  games: number;
  wins: number;
}

export type Verdict = 'nerf' | 'buff' | 'ok' | 'poucos-dados';

/** Abaixo disso o win rate é ruído demais para dizer qualquer coisa. */
export const MIN_GAMES_FOR_VERDICT = 20;

export const rate = (t: Tally): number | null => (t.games ? t.wins / t.games : null);

/** Intervalo de Wilson (95%): não estoura 0–1 e se comporta bem com amostra pequena. */
export function wilson(t: Tally, z = 1.96): [number, number] | null {
  const { games: n, wins } = t;
  if (!n) return null;
  const p = wins / n;
  const z2 = z * z;
  const center = (p + z2 / (2 * n)) / (1 + z2 / n);
  const half = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / (1 + z2 / n);
  return [Math.max(0, center - half), Math.min(1, center + half)];
}

/**
 * Nerf: ganha bem mais que a média e o intervalo inteiro fica acima de 50%.
 * Buff: o contrário. O resto está dentro do esperado ou não tem partidas suficientes.
 */
export function verdictOf(t: Tally): Verdict {
  if (t.games < MIN_GAMES_FOR_VERDICT) return 'poucos-dados';
  const p = t.wins / t.games;
  const [lo, hi] = wilson(t)!;
  if (p > 0.58 && lo > 0.5) return 'nerf';
  if (p < 0.42 && hi < 0.5) return 'buff';
  return 'ok';
}

export const pct = (p: number | null) => (p === null ? '—' : `${Math.round(100 * p)}%`);
