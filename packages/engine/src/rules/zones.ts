import { findPro, findSpell, isNegated, prosOf } from '../core/board';
import { effectsOf, nameOf, proLabel } from '../core/catalog';
import { log } from '../core/log';
import { shuffle } from '../core/rng';
import type { CardInstance, GameState, ProSlot, Seat } from '../core/types';
import type { FlipCause } from '../effects/types';
import { ctxFor, proEffects } from '../effects/context';
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
  dropEquips(s, iid);
  return f.slot;
}

/** O equipado saiu do campo: os Equipamentos presos a ele vão para o cemitério. */
function dropEquips(s: GameState, iid: string) {
  for (const p of s.players) {
    p.spells.forEach((x, i) => {
      if (!x || x.equippedTo !== iid) return;
      p.spells[i] = null;
      toGrave(s, x.card);
      log(s, 'destroy', `"${nameOf(x.card)}" saiu de campo junto com o equipado.`, {
        seat: x.card.owner,
        cardId: x.card.cardId,
        iid: x.card.iid,
      });
    });
  }
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
  const fx = proEffects(s, f.slot);
  if (!cause.self && !cause.battle && cause.bySeat !== undefined && cause.bySeat !== f.seat) {
    const immune = fx?.immuneToOppEffects?.(ctxFor(s, f.slot.card));
    if (immune) {
      log(s, 'effect', immune, { seat: f.seat, cardId: id });
      return false;
    }
    for (const ally of prosOf(s, f.seat)) {
      if (ally === f.slot) continue;
      const by = proEffects(s, ally)?.protectAllyFromOppEffects?.(ctxFor(s, ally.card), f.slot);
      if (by) {
        log(s, 'effect', by, { seat: f.seat, cardId: ally.card.cardId, iid: ally.card.iid, target: iid });
        return false;
      }
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
  const label = proLabel(f.slot);
  log(s, 'effect', `${label[0].toUpperCase()}${label.slice(1)} voltou para a mão.`, {
    seat: f.seat,
    ...(!f.slot.faceDown && { cardId: f.slot.card.cardId }),
  });
}

/** Muda a posição; o card pode se transformar em outro (ex.: par Douglas Ataque/Defensivo). */
export function setPosition(s: GameState, iid: string, pos: 'atk' | 'def') {
  const f = findPro(s, iid);
  if (!f) return;
  // Ir para Ataque revela um card virado (como "mude para Ataque com a face para cima").
  if (f.slot.faceDown && pos === 'atk') flipFaceUp(s, iid, 'effect');
  if (!findPro(s, iid) || f.slot.position === pos) return;
  f.slot.position = pos;
  const into = proEffects(s, f.slot)?.onPositionChange?.(ctxFor(s, f.slot.card), pos);
  if (into) transform(s, f.slot, into);
}

function transform(s: GameState, slot: ProSlot, to: string) {
  const from = slot.card.cardId;
  slot.card = { ...slot.card, cardId: to };
  log(s, 'effect', `"${nameOf(from)}" virou "${nameOf(to)}"!`, { seat: slot.card.owner, cardId: to });
}

/** Anula os efeitos de um Profissional até `untilTurn` (inclusive); nunca encurta uma anulação maior. */
export function negatePro(s: GameState, iid: string, untilTurn: number) {
  const f = findPro(s, iid);
  if (!f) return;
  f.slot.negatedUntilTurn = Math.max(f.slot.negatedUntilTurn ?? -1, untilTurn);
}

/** Revela um Profissional virado e mostra quem ele é. Não resolve o FLIP (veja flipFaceUp). */
export function revealPro(s: GameState, slot: ProSlot) {
  if (!slot.faceDown) return;
  slot.faceDown = false;
  log(s, 'flip', `"${nameOf(slot.card)}" foi virado para cima!`, { seat: slot.card.owner, cardId: slot.card.cardId, iid: slot.card.iid });
}

/** Efeito FLIP do card — resolve mesmo que ele já tenha saído do campo (virado por ataque e destruído). */
export function resolveFlip(s: GameState, slot: ProSlot, cause: FlipCause) {
  if (s.winner !== null || isNegated(s, slot)) return;
  const fx = effectsOf(slot.card.cardId);
  if (!fx?.onFlip) return;
  log(s, 'effect', `FLIP! "${nameOf(slot.card)}"`, { seat: slot.card.owner, cardId: slot.card.cardId, iid: slot.card.iid });
  fx.onFlip(ctxFor(s, slot.card), cause);
}

/** Vira para cima por efeito (fica na posição em que está) e resolve o FLIP. */
export function flipFaceUp(s: GameState, iid: string, cause: FlipCause = 'effect') {
  const f = findPro(s, iid);
  if (!f || !f.slot.faceDown) return;
  revealPro(s, f.slot);
  resolveFlip(s, f.slot, cause);
}

/** Vira para baixo por efeito: vai para Defesa virado (efeitos desligados). */
export function setFaceDown(s: GameState, iid: string) {
  const f = findPro(s, iid);
  if (!f || f.slot.faceDown) return;
  setPosition(s, iid, 'def');
  const g = findPro(s, iid);
  if (!g) return;
  g.slot.faceDown = true;
  log(s, 'info', `"${nameOf(g.slot.card)}" foi virado para baixo.`, { seat: g.seat, iid });
}
