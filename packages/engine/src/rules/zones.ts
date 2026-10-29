import { findPro, findSpell } from '../core/board';
import { effectsOf, nameOf } from '../core/catalog';
import { log } from '../core/log';
import { shuffle } from '../core/rng';
import type { CardInstance, GameState, ProSlot, Seat } from '../core/types';
import { ctxFor } from '../effects/context';
import { lose } from './win';

/** Movimentação de cards entre deck, mão, campo e cemitério. */

export function draw(s: GameState, seat: Seat, n = 1) {
  const p = s.players[seat];
  for (let i = 0; i < n; i++) {
    const c = p.deck.pop();
    if (!c) {
      lose(s, seat, `${p.name} não tem mais cards no deck — backlog vazio, projeto cancelado.`, 'deckout');
      return;
    }
    p.hand.push(c);
    log(s, 'draw', `${p.name} comprou 1 card.`, { seat });
  }
}

export function searchDeck(s: GameState, seat: Seat, pred: (cardId: string) => boolean): CardInstance | null {
  const p = s.players[seat];
  const idx = p.deck.findIndex((c) => pred(c.cardId));
  if (idx < 0) return null;
  const [c] = p.deck.splice(idx, 1);
  p.hand.push(c);
  shuffle(s, p.deck);
  log(s, 'effect', `${p.name} adicionou "${nameOf(c)}" do deck à mão.`, { seat, cardId: c.cardId });
  return c;
}

export function toGrave(s: GameState, c: CardInstance) {
  s.players[c.owner].grave.push(c);
}

function removePro(s: GameState, iid: string): ProSlot | null {
  const f = findPro(s, iid);
  if (!f) return null;
  s.players[f.seat].pros[f.idx] = null;
  return f.slot;
}

export interface DestroyCause {
  battle: boolean;
  /** Profissional que destruiu em batalha. */
  byIid?: string;
  /** Seat que causou o efeito (para imunidades "efeitos do oponente"). */
  bySeat?: Seat;
  /** Destruição pelo próprio dono (sacrifício/estresse) — ignora imunidades. */
  self?: boolean;
}

/** Retorna true se o card foi de fato destruído. */
export function destroyPro(s: GameState, iid: string, cause: DestroyCause): boolean {
  const f = findPro(s, iid);
  if (!f) return false;
  const id = f.slot.card.cardId;
  const fx = effectsOf(id);
  if (!cause.self && !cause.battle && cause.bySeat !== undefined && cause.bySeat !== f.seat) {
    const immune = fx?.immuneToOppEffects?.(ctxFor(s, f.slot.card));
    if (immune) {
      log(s, 'effect', immune, { seat: f.seat, cardId: id });
      return false;
    }
  }
  removePro(s, iid);
  toGrave(s, f.slot.card);
  if (!cause.self) log(s, 'destroy', `"${nameOf(id)}" foi destruído.`, { seat: f.seat, cardId: id, iid });
  fx?.onDestroyed?.(ctxFor(s, f.slot.card), { battle: cause.battle, byIid: cause.byIid });
  return true;
}

export function tribute(s: GameState, iid: string) {
  const f = findPro(s, iid);
  if (!f) return;
  removePro(s, iid);
  toGrave(s, f.slot.card);
  log(s, 'info', `"${nameOf(f.slot.card)}" foi realocado para outra squad (sacrifício).`, { seat: f.seat, cardId: f.slot.card.cardId });
}

export function destroySpell(s: GameState, iid: string): boolean {
  const f = findSpell(s, iid);
  if (!f) return false;
  const p = s.players[f.seat];
  if (f.idx === -1) p.field = null;
  else p.spells[f.idx] = null;
  toGrave(s, f.slot.card);
  log(s, 'destroy', `"${nameOf(f.slot.card)}" foi destruído.`, { seat: f.seat, cardId: f.slot.card.cardId, iid });
  return true;
}

export function bounceToHand(s: GameState, iid: string) {
  const f = findPro(s, iid);
  if (!f) return;
  removePro(s, iid);
  s.players[f.slot.card.owner].hand.push(f.slot.card);
  log(s, 'effect', `"${nameOf(f.slot.card)}" voltou para a mão.`, { seat: f.seat, cardId: f.slot.card.cardId });
}

/** Muda a posição; o card pode se transformar em outro (ex.: par Douglas Ataque/Defensivo). */
export function setPosition(s: GameState, iid: string, pos: 'atk' | 'def') {
  const f = findPro(s, iid);
  if (!f || f.slot.position === pos) return;
  f.slot.position = pos;
  const into = effectsOf(f.slot.card.cardId)?.onPositionChange?.(ctxFor(s, f.slot.card), pos);
  if (into) transform(s, f.slot, into);
}

function transform(s: GameState, slot: ProSlot, to: string) {
  const from = slot.card.cardId;
  slot.card = { ...slot.card, cardId: to };
  log(s, 'effect', `"${nameOf(from)}" virou "${nameOf(to)}"!`, { seat: slot.card.owner, cardId: to });
}
