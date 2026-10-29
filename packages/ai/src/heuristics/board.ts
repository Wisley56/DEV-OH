import { getAtk, getDef, prosOf, type GameState, type ProSlot, type Seat } from '@devoh/engine';

/** Força de um Profissional na posição atual (ATK em ataque, DEF em defesa). */
export const value = (s: GameState, seat: Seat, p: ProSlot) => (p.position === 'atk' ? getAtk(s, seat, p) : getDef(s, seat, p));

export function strongest(s: GameState, seat: Seat, filter: (p: ProSlot) => boolean = () => true) {
  return prosOf(s, seat)
    .filter(filter)
    .sort((a, b) => value(s, seat, b) - value(s, seat, a))[0];
}
