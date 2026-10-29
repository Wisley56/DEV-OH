import { isNegated, prosOf } from '../core/board';
import { card, effectsOf } from '../core/catalog';
import { tributesNeeded } from '../core/constants';
import type { GameState, LogEntry, Outcome, Phase, Seat } from '../core/types';
import { ctxFor } from '../effects/context';
import { positionBlock } from '../rules/actions';
import { attackBlock } from '../rules/battle';
import { getAtk, getDef } from '../rules/stats';

export interface HandCardView {
  iid: string;
  cardId: string;
  canSummon: boolean;
  canActivate: boolean;
  canSet: boolean;
}

export interface ProView {
  iid: string;
  cardId: string;
  position: 'atk' | 'def';
  atk: number;
  def: number;
  canAttack: boolean;
  canChangePos: boolean;
  canIgnite: boolean;
  locked: boolean;
  /** Só presente quando os efeitos estão anulados neste turno. */
  negated?: true;
}

export interface SpellView {
  iid: string;
  /** null quando o card está virado e escondido para quem está vendo. */
  cardId: string | null;
  faceDown: boolean;
  revealed: boolean;
}

export interface PlayerView {
  name: string;
  lp: number;
  stress: number;
  deckCount: number;
  handCount: number;
  hand: HandCardView[] | null;
  grave: string[];
  pros: (ProView | null)[];
  spells: (SpellView | null)[];
  field: SpellView | null;
  shocked: boolean;
  summonedThisTurn: boolean;
}

export interface GameView {
  you: Seat;
  turn: number;
  active: Seat;
  phase: Phase;
  winner: Seat | 'draw' | null;
  outcome: Outcome | null;
  players: [PlayerView, PlayerView];
  log: LogEntry[];
}

/** Estado visível para `viewer`: esconde mão e cards virados do oponente. */
export function getView(s: GameState, viewer: Seat): GameView {
  const myTurn = s.active === viewer && s.winner === null;
  const mk = (seat: Seat): PlayerView => {
    const p = s.players[seat];
    const mine = seat === viewer;
    const canAct = mine && myTurn;
    const freePro = p.pros.filter((x) => !x).length;
    const freeSpell = p.spells.some((x) => !x);
    const proCount = prosOf(s, seat).length;
    const shocked = p.shockedUntilTurn >= s.turn;
    return {
      name: p.name,
      lp: p.lp,
      stress: p.stress,
      deckCount: p.deck.length,
      handCount: p.hand.length,
      hand: mine
        ? p.hand.map((c) => {
            const d = card(c.cardId);
            const main = canAct && s.phase === 'main';
            const need = tributesNeeded(d.level ?? 1);
            const fx = effectsOf(d.id);
            return {
              iid: c.iid,
              cardId: c.cardId,
              canSummon: main && d.kind === 'pro' && !p.summonedThisTurn && proCount >= need && (need > 0 || freePro > 0),
              canActivate:
                main && d.kind === 'task' && !shocked && (d.speed !== 'continuous' || freeSpell) && !fx?.canActivate?.(ctxFor(s, c)),
              canSet: main && d.kind === 'bug' && freeSpell,
            };
          })
        : null,
      grave: p.grave.map((c) => c.cardId),
      pros: p.pros.map((slot) => {
        if (!slot) return null;
        const d = card(slot.card.cardId);
        return {
          iid: slot.card.iid,
          cardId: slot.card.cardId,
          position: slot.position,
          atk: getAtk(s, seat, slot),
          def: getDef(s, seat, slot),
          canAttack: canAct && !attackBlock(s, seat, slot),
          canChangePos: canAct && s.phase === 'main' && !positionBlock(s, slot),
          canIgnite:
            canAct &&
            s.phase === 'main' &&
            !!d.ignition &&
            slot.ignitionTurn !== s.turn &&
            !isNegated(s, slot) &&
            !effectsOf(d.id)?.canIgnite?.(ctxFor(s, slot.card)),
          locked: slot.lockedUntilTurn >= s.turn,
          ...(isNegated(s, slot) && { negated: true as const }),
        };
      }),
      spells: p.spells.map((x) =>
        x
          ? {
              iid: x.card.iid,
              cardId: mine || !x.faceDown || x.revealed ? x.card.cardId : null,
              faceDown: x.faceDown,
              revealed: x.revealed,
            }
          : null,
      ),
      field: p.field ? { iid: p.field.card.iid, cardId: p.field.card.cardId, faceDown: false, revealed: true } : null,
      shocked,
      summonedThisTurn: p.summonedThisTurn,
    };
  };
  return {
    you: viewer,
    turn: s.turn,
    active: s.active,
    phase: s.phase,
    winner: s.winner,
    outcome: s.outcome,
    players: [mk(0), mk(1)],
    log: s.log.slice(-80),
  };
}
