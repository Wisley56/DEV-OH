import { equipsOf, faceUpSpellIds, other, prosOf } from '../core/board';
import { card, effectsOf } from '../core/catalog';
import type { GameState, ProSlot, Seat } from '../core/types';
import { proEffects } from '../effects/context';
import type { CardEffects, StatCtx } from '../effects/types';

/**
 * Um pedaço do ATK/DEF atual de um Profissional e de onde ele vem: um card (`cardId`) ou uma
 * regra do jogo (`rule`). `mult` é o multiplicador de um Equipamento (Moisés Bombado = 2).
 */
export interface StatPart {
  cardId?: string;
  /** stress = Modo Desespero; mod = mudança permanente por efeito; temp = até o fim do turno. */
  rule?: 'stress' | 'mod' | 'temp';
  atk?: number;
  def?: number;
  mult?: number;
}

/** Cards virados para cima do oponente de `seat` que podem ter aura sobre ele (Tasks e Profissionais). */
function oppAuraSources(s: GameState, seat: Seat): { cardId: string; fx: CardEffects }[] {
  const opp = other(seat);
  const out: { cardId: string; fx: CardEffects }[] = [];
  for (const id of faceUpSpellIds(s, opp)) {
    const fx = effectsOf(id);
    if (fx?.oppAura) out.push({ cardId: id, fx });
  }
  for (const pro of prosOf(s, opp)) {
    const fx = proEffects(s, pro);
    if (fx?.oppAura) out.push({ cardId: pro.card.cardId, fx });
  }
  return out;
}

/**
 * Tudo o que muda o ATK e a DEF de um Profissional além do valor impresso, na ordem da conta:
 * ajuste da base, modificadores, Estresse, bônus do card, auras dos dois lados e Equipamentos.
 * `getAtk` e `getDef` somam esta lista; a interface a mostra em "de onde vem esse ATK".
 */
export function statParts(s: GameState, seat: Seat, slot: ProSlot): StatPart[] {
  const def = card(slot.card.cardId);
  const fx = proEffects(s, slot);
  const q: StatCtx = { s, seat, slot, def };
  const out: StatPart[] = [];
  /** Guarda só o que muda alguma coisa, sem os zeros. */
  const add = ({ atk, def: d, mult, ...from }: StatPart) => {
    const part: StatPart = { ...from, ...(atk && { atk }), ...(d && { def: d }), ...(mult && mult !== 1 && { mult }) };
    if (part.atk || part.def || part.mult) out.push(part);
  };
  const base = def.atk ?? 0;
  if (fx?.atkBase) add({ cardId: def.id, atk: fx.atkBase(q, base) - base });
  add({ rule: 'mod', atk: slot.atkMod, def: slot.defMod });
  add({ rule: 'temp', atk: slot.tempAtk });
  add({ rule: 'stress', atk: s.players[seat].stress * 100 }); // Modo Desespero
  if (fx?.atkBonus) add({ cardId: def.id, atk: fx.atkBonus(q) });
  for (const id of faceUpSpellIds(s, seat)) {
    const aura = effectsOf(id)?.auraAtk;
    if (aura) add({ cardId: id, atk: aura(q) });
  }
  for (const src of oppAuraSources(s, seat)) {
    const a = src.fx.oppAura!(q);
    add({ cardId: src.cardId, atk: a.atk ?? 0, def: a.def ?? 0 });
  }
  for (const eq of equipsOf(s, slot.card.iid)) {
    const b = effectsOf(eq.card.cardId)?.equip?.(q);
    if (b) add({ cardId: eq.card.cardId, atk: b.atk ?? 0, def: b.def ?? 0, mult: b.mult ?? 1 });
  }
  return out;
}

function total(base: number, parts: StatPart[], key: 'atk' | 'def') {
  let sum = base;
  let mult = 1;
  for (const p of parts) {
    sum += p[key] ?? 0;
    mult *= p.mult ?? 1;
  }
  return Math.max(0, sum * mult);
}

/** ATK atual: base + modificadores + Estresse + bônus do card + auras dos dois lados, vezes os Equipamentos. */
export function getAtk(s: GameState, seat: Seat, slot: ProSlot): number {
  return total(card(slot.card.cardId).atk ?? 0, statParts(s, seat, slot), 'atk');
}

export function getDef(s: GameState, seat: Seat, slot: ProSlot): number {
  return total(card(slot.card.cardId).def ?? 0, statParts(s, seat, slot), 'def');
}
