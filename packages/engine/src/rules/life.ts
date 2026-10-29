import { log, pname } from '../core/log';
import type { GameState, Seat } from '../core/types';
import { checkWin } from './win';

export function damage(s: GameState, seat: Seat, amount: number, why = '') {
  if (amount <= 0 || s.winner !== null) return;
  s.players[seat].lp = Math.max(0, s.players[seat].lp - amount);
  log(s, 'damage', `${pname(s, seat)} perdeu ${amount} LP${why ? ` (${why})` : ''}.`, { seat, amount });
  checkWin(s);
}

export function heal(s: GameState, seat: Seat, amount: number) {
  if (amount <= 0) return;
  s.players[seat].lp += amount;
  log(s, 'heal', `${pname(s, seat)} recuperou ${amount} LP.`, { seat, amount });
}
