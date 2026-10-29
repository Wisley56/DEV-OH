import { other, prosOf } from '../core/board';
import { card, effectsOf } from '../core/catalog';
import { log } from '../core/log';
import type { BugTrigger, GameState, Seat } from '../core/types';
import { toGrave } from '../rules/zones';
import { ctxFor, proEffects } from './context';
import type { BugEvent } from './types';

/**
 * Dispara o primeiro Bug virado do `defender` que responde a um dos triggers.
 * Antes de resolver, o oponente pode anulá-lo com um Contra-Bug (trigger oppBug) —
 * só um nível de resposta (`depth`), para não haver loop.
 * Bug Contínuo fica virado para cima na zona; os outros vão para o cemitério.
 * Retorna o evento (possivelmente negado/alterado).
 */
export function fireBugs(s: GameState, defender: Seat, triggers: BugTrigger[], ev: BugEvent, depth = 0): BugEvent {
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
    log(s, 'bug', `${p.name} ativou o Bug "${d.name}"!`, { seat: defender, cardId: d.id, iid: slot.card.iid });
    if (depth === 0) {
      const counter = fireBugs(s, other(defender), ['oppBug'], { trigger: 'oppBug', bug: slot.card.iid }, 1);
      if (counter.negated) {
        toGrave(s, slot.card);
        log(s, 'effect', `"${d.name}" foi anulado.`, { seat: defender, cardId: d.id });
        break;
      }
    }
    if (d.bugType === 'continuous') p.spells[i] = { ...slot, faceDown: false, revealed: true };
    else toGrave(s, slot.card);
    for (const seat of [0, 1] as Seat[]) {
      for (const pro of prosOf(s, seat)) proEffects(s, pro)?.onAnyBug?.(ctxFor(s, pro.card));
    }
    fx?.onTrigger?.(ctx, ev);
    break;
  }
  return ev;
}
