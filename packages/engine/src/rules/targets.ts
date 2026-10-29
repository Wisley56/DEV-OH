import { findPro, findSpell, other } from '../core/board';
import type { GameState, Seat, TargetKind } from '../core/types';

export function validTarget(s: GameState, me: Seat, kind: TargetKind, iid: string | undefined): boolean {
  if (!iid) return false;
  if (kind === 'oppSet') {
    const f = findSpell(s, iid);
    return !!f && f.seat === other(me) && f.slot.faceDown;
  }
  const f = findPro(s, iid);
  if (!f) return false;
  if (kind === 'ownPro') return f.seat === me;
  if (kind === 'oppPro') return f.seat === other(me);
  return true;
}

/** Existe pelo menos um alvo válido desse tipo? */
export function hasValidTarget(s: GameState, me: Seat, kind: TargetKind): boolean {
  const ids = [0, 1].flatMap((seat) => [...s.players[seat].pros, ...s.players[seat].spells].map((x) => x?.card.iid));
  return ids.some((iid) => validTarget(s, me, kind, iid));
}
