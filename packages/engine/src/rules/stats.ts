import { faceUpTaskIds, other, prosOf } from '../core/board';
import { card, effectsOf } from '../core/catalog';
import type { GameState, ProSlot, Seat } from '../core/types';
import { proEffects } from '../effects/context';
import type { CardEffects, StatCtx } from '../effects/types';

/** Cards virados para cima do oponente de `seat` que podem ter aura sobre ele (Tasks e Profissionais). */
function oppAuraSources(s: GameState, seat: Seat): CardEffects[] {
  const opp = other(seat);
  const out: CardEffects[] = [];
  for (const id of faceUpTaskIds(s, opp)) {
    const fx = effectsOf(id);
    if (fx?.oppAura) out.push(fx);
  }
  for (const pro of prosOf(s, opp)) {
    const fx = proEffects(s, pro);
    if (fx?.oppAura) out.push(fx);
  }
  return out;
}

/** ATK atual: base (com ajuste do card) + modificadores + Estresse + bônus do card + auras dos dois lados. */
export function getAtk(s: GameState, seat: Seat, slot: ProSlot): number {
  const def = card(slot.card.cardId);
  const fx = proEffects(s, slot);
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
  for (const src of oppAuraSources(s, seat)) atk += src.oppAura!(q).atk ?? 0;
  return Math.max(0, atk);
}

export function getDef(s: GameState, seat: Seat, slot: ProSlot): number {
  const def = card(slot.card.cardId);
  const q: StatCtx = { s, seat, slot, def };
  let total = (def.def ?? 0) + slot.defMod;
  for (const src of oppAuraSources(s, seat)) total += src.oppAura!(q).def ?? 0;
  return Math.max(0, total);
}
