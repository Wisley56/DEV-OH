import { getAtk, getDef, prosOf, type GameState, type ProSlot, type Seat } from '@devoh/engine';

/** DEF que o bot supõe para um Profissional virado que ele não conhece. */
export const HIDDEN_DEF = 1500;

/**
 * Força de um Profissional na posição atual (ATK em ataque, DEF em defesa).
 * Card virado: o bot só sabe o valor real se for dele (`known`); senão supõe HIDDEN_DEF — sem espiar.
 */
export const value = (s: GameState, seat: Seat, p: ProSlot, known = false) =>
  p.faceDown && !known ? HIDDEN_DEF : p.position === 'atk' ? getAtk(s, seat, p) : getDef(s, seat, p);

export function strongest(s: GameState, seat: Seat, filter: (p: ProSlot) => boolean = () => true) {
  return prosOf(s, seat)
    .filter(filter)
    .sort((a, b) => value(s, seat, b) - value(s, seat, a))[0];
}

/** Sorteio determinístico (não mexe no RNG do estado): mesma situação, mesma decisão. */
export function chance(s: GameState, salt: string, pct: number): boolean {
  let h = (s.rng ^ Math.imul(s.turn, 0x9e3779b1)) | 0;
  for (let i = 0; i < salt.length; i++) h = Math.imul(h ^ salt.charCodeAt(i), 0x01000193);
  return (h >>> 0) % 100 < pct;
}
