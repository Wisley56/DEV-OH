import { other, prosOf } from '../core/board';
import { card, nameOf } from '../core/catalog';
import { MAX_STRESS, STRESS_AFTER_MELTDOWN } from '../core/constants';
import { log } from '../core/log';
import type { GameState, Seat } from '../core/types';
import { ctxFor, proEffects } from '../effects/context';
import { destroyPro } from './zones';

/**
 * Altera o Estresse. byOpponent = o aumento vem de um efeito do oponente
 * (permite que um card do lado afetado devolva o Estresse).
 */
export function addStress(s: GameState, seat: Seat, n: number, byOpponent = false) {
  if (n === 0 || s.winner !== null) return;
  const p = s.players[seat];
  if (n > 0 && byOpponent) {
    for (const pro of prosOf(s, seat)) {
      if (proEffects(s, pro)?.reflectOppStress?.(ctxFor(s, pro.card))) {
        addStress(s, other(seat), n, false);
        return;
      }
    }
  }
  const before = p.stress;
  p.stress = Math.max(0, Math.min(MAX_STRESS, p.stress + n));
  if (p.stress === before) return;
  log(s, 'stress', `Estresse de ${p.name}: ${before} → ${p.stress}.`, { seat, amount: p.stress - before });
  if (p.stress >= MAX_STRESS) meltdown(s, seat);
}

/** Estresse no máximo: o Profissional de maior nível pede demissão. */
function meltdown(s: GameState, seat: Seat) {
  const p = s.players[seat];
  const victims = prosOf(s, seat).sort((a, b) => (card(b.card.cardId).level ?? 0) - (card(a.card.cardId).level ?? 0));
  log(s, 'stress', `${p.name} chegou no limite do Estresse!`, { seat });
  p.stress = STRESS_AFTER_MELTDOWN;
  if (victims[0]) {
    log(s, 'destroy', `"${nameOf(victims[0].card)}" pediu demissão!`, { seat, cardId: victims[0].card.cardId });
    destroyPro(s, victims[0].card.iid, { battle: false, self: true });
  }
}
