import { prosOf } from '../core/board';
import { card, effectsOf } from '../core/catalog';
import { log } from '../core/log';
import type { BugTrigger, GameState, Seat } from '../core/types';
import { toGrave } from '../rules/zones';
import { ctxFor } from './context';
import type { BugEvent } from './types';

/**
 * Dispara o primeiro Bug virado do `defender` que responde a um dos triggers.
 * Retorna o evento (possivelmente negado/alterado).
 */
export function fireBugs(s: GameState, defender: Seat, triggers: BugTrigger[], ev: BugEvent): BugEvent {
  const p = s.players[defender];
  if (s.winner !== null) return ev;
  if (p.shockedUntilTurn >= s.turn) return ev;
  for (let i = 0; i < p.spells.length; i++) {
    const slot = p.spells[i];
    if (!slot || !slot.faceDown || slot.setTurn === s.turn) continue;
    const d = card(slot.card.cardId);
    if (d.kind !== 'bug' || !d.trigger || !triggers.includes(d.trigger)) continue;
    const fx = effectsOf(d.id);
    const ctx = ctxFor(s, slot.card);
    if (fx?.bugCondition && !fx.bugCondition(ctx, ev)) continue;
    p.spells[i] = null;
    toGrave(s, slot.card);
    log(s, 'bug', `${p.name} ativou o Bug "${d.name}"!`, { seat: defender, cardId: d.id, iid: slot.card.iid });
    for (const seat of [0, 1] as Seat[]) {
      for (const pro of prosOf(s, seat)) effectsOf(pro.card.cardId)?.onAnyBug?.(ctxFor(s, pro.card));
    }
    fx?.onTrigger?.(ctx, ev);
    break;
  }
  return ev;
}
