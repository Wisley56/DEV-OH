import { other } from '../core/board';
import { log, pname } from '../core/log';
import type { GameState, OutcomeReason, Seat } from '../core/types';

export function checkWin(s: GameState) {
  if (s.winner !== null) return;
  const dead = ([0, 1] as Seat[]).filter((seat) => s.players[seat].lp <= 0);
  if (dead.length === 2) {
    s.winner = 'draw';
    s.outcome = { reason: 'draw', loser: null };
  } else if (dead.length === 1) {
    s.winner = other(dead[0]);
    s.outcome = { reason: 'lp', loser: dead[0] };
  }
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

export function lose(s: GameState, seat: Seat, why: string, reason: OutcomeReason) {
  if (s.winner !== null) return;
  log(s, 'info', why, { seat });
  s.winner = other(seat);
  s.outcome = { reason, loser: seat };
  s.phase = 'ended';
  log(s, 'win', `${pname(s, s.winner)} venceu o duelo!`, { seat: s.winner });
}

/**
 * Derrota decidida fora das regras do duelo (o servidor aplica): estourou o tempo
 * vezes demais ou não voltou depois de cair. Devolve um estado novo.
 */
export function forfeit(state: GameState, seat: Seat, reason: 'timeout' | 'abandon'): GameState {
  const s = structuredClone(state);
  const why =
    reason === 'timeout'
      ? `${pname(s, seat)} estourou o tempo 3 vezes seguidas — reunião encerrada.`
      : `${pname(s, seat)} abandonou a sala — vitória por W.O.`;
  lose(s, seat, why, reason);
  return s;
}
