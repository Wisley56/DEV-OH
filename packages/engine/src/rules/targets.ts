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
