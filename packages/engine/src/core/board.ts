import type { CardInstance, GameState, ProSlot, Seat, SpellSlot } from './types';

/** Consultas e construtores do tabuleiro, sem regra de jogo. */

export const other = (seat: Seat): Seat => (seat === 0 ? 1 : 0);

export function newInstance(s: GameState, cardId: string, owner: Seat): CardInstance {
  return { iid: `c${s.nextIid++}`, cardId, owner };
}

export function newProSlot(c: CardInstance, position: 'atk' | 'def', turn: number): ProSlot {
  return {
    card: c,
    position,
    atkMod: 0,
    defMod: 0,
    tempAtk: 0,
    summonedTurn: turn,
    attackedTurn: -1,
    changedPosTurn: -1,
    ignitionTurn: -1,
    lockedUntilTurn: -1,
    oncePerTurn: {},
  };
}

export function findPro(s: GameState, iid: string | undefined) {
  if (!iid) return null;
  for (const seat of [0, 1] as Seat[]) {
    const idx = s.players[seat].pros.findIndex((p) => p?.card.iid === iid);
    if (idx >= 0) return { seat, idx, slot: s.players[seat].pros[idx]! };
  }
  return null;
}

export function findSpell(s: GameState, iid: string | undefined) {
  if (!iid) return null;
  for (const seat of [0, 1] as Seat[]) {
    const p = s.players[seat];
    const idx = p.spells.findIndex((x) => x?.card.iid === iid);
    if (idx >= 0) return { seat, idx, slot: p.spells[idx]! };
    if (p.field?.card.iid === iid) return { seat, idx: -1, slot: p.field };
  }
  return null;
}

export const prosOf = (s: GameState, seat: Seat) => s.players[seat].pros.filter((p): p is ProSlot => !!p);
export const setCardsOf = (s: GameState, seat: Seat) => s.players[seat].spells.filter((x): x is SpellSlot => !!x && x.faceDown);

export function proOnField(s: GameState, seat: Seat, cardId: string): ProSlot | undefined {
  return prosOf(s, seat).find((p) => p.card.cardId === cardId);
}

export function hasFaceUp(s: GameState, seat: Seat, cardId: string): boolean {
  const p = s.players[seat];
  if (p.field?.card.cardId === cardId) return true;
  return p.spells.some((x) => x && !x.faceDown && x.card.cardId === cardId);
}

/** Ids distintos das Tasks viradas para cima de `seat` (campo + zonas), na ordem do tabuleiro. */
export function faceUpTaskIds(s: GameState, seat: Seat): string[] {
  const p = s.players[seat];
  const ids: string[] = [];
  for (const x of [p.field, ...p.spells]) if (x && !x.faceDown && !ids.includes(x.card.cardId)) ids.push(x.card.cardId);
  return ids;
}

export function isOnce(rec: Record<string, number>, key: string, turn: number) {
  return rec[key] === turn;
}
export function markOnce(rec: Record<string, number>, key: string, turn: number) {
  rec[key] = turn;
}
