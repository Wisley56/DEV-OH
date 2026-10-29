import { other } from '../core/board';
import { log, pname } from '../core/log';
import type { GameState, Seat } from '../core/types';

export function checkWin(s: GameState) {
  if (s.winner !== null) return;
  const dead = ([0, 1] as Seat[]).filter((seat) => s.players[seat].lp <= 0);
  if (dead.length === 2) s.winner = 'draw';
  else if (dead.length === 1) s.winner = other(dead[0]);
  if (s.winner !== null) {
    s.phase = 'ended';
    log(
      s,
      'win',
      s.winner === 'draw' ? 'Empate! A sprint acabou para todo mundo.' : `${pname(s, s.winner)} entregou a Sprint e venceu o duelo!`,
      {
        seat: s.winner === 'draw' ? undefined : s.winner,
      },
    );
  }
}

export function lose(s: GameState, seat: Seat, why: string) {
  if (s.winner !== null) return;
  log(s, 'info', why, { seat });
  s.winner = other(seat);
  s.phase = 'ended';
  log(s, 'win', `${pname(s, s.winner)} venceu o duelo!`, { seat: s.winner });
}
