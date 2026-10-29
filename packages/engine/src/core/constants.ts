export const START_LP = 4000;
export const START_HAND = 4;
export const MAX_STRESS = 7;
export const STRESS_AFTER_MELTDOWN = 0;
export const ZONES = 3;
export const HAND_LIMIT = 7;
export const MAX_LOG = 200;

export const DECK_MIN = 20;
export const DECK_MAX = 30;
export const MAX_COPIES = 3;

/** Sacrifícios para invocar: nível 5–6 pede 1, nível 7+ pede 2. */
export function tributesNeeded(level: number): number {
  if (level >= 7) return 2;
  if (level >= 5) return 1;
  return 0;
}
