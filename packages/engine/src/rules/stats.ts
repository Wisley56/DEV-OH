import { faceUpTaskIds } from '../core/board';
import { card, effectsOf } from '../core/catalog';
import type { GameState, ProSlot, Seat } from '../core/types';
import type { StatCtx } from '../effects/types';

/** ATK atual: base (com ajuste do card) + modificadores + Estresse + bônus do card + auras das Tasks do lado. */
export function getAtk(s: GameState, seat: Seat, slot: ProSlot): number {
  const def = card(slot.card.cardId);
  const fx = effectsOf(def.id);
  const q: StatCtx = { s, seat, slot, def };
  let base = def.atk ?? 0;
  if (fx?.atkBase) base = fx.atkBase(q, base);
  let atk = base + slot.atkMod + slot.tempAtk;
  atk += s.players[seat].stress * 100; // Modo Desespero
  if (fx?.atkBonus) atk += fx.atkBonus(q);
  for (const id of faceUpTaskIds(s, seat)) {
    const aura = effectsOf(id)?.auraAtk;
    if (aura) atk += aura(q);
  }
  return Math.max(0, atk);
}

export function getDef(_s: GameState, _seat: Seat, slot: ProSlot): number {
  return Math.max(0, (card(slot.card.cardId).def ?? 0) + slot.defMod);
}
