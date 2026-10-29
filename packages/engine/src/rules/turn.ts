import { findPro, newInstance, other, prosOf } from '../core/board';
import { card, effectsOf, nameOf } from '../core/catalog';
import { HAND_LIMIT, START_HAND, START_LP, ZONES } from '../core/constants';
import { log, pname } from '../core/log';
import { shuffle } from '../core/rng';
import type { GameState, PlayerState, Seat } from '../core/types';
import { ctxFor, proEffects } from '../effects/context';
import { draw, toGrave } from './zones';

export interface NewGameOptions {
  players: [{ name: string; deck: string[] }, { name: string; deck: string[] }];
  seed?: number;
  /** Quem começa; se omitido, sorteia. */
  first?: Seat;
}

export function createGame(opts: NewGameOptions): GameState {
  const seed = opts.seed ?? Math.floor(Math.random() * 2 ** 31);
  const emptyPlayer = (name: string): PlayerState => ({
    name,
    lp: START_LP,
    stress: 0,
    deck: [],
    hand: [],
    grave: [],
    pros: Array(ZONES).fill(null),
    spells: Array(ZONES).fill(null),
    field: null,
    summonedThisTurn: false,
    shockedUntilTurn: -1,
    noAttackTurn: -1,
    oncePerTurn: {},
  });
  const s: GameState = {
    players: [emptyPlayer(opts.players[0].name), emptyPlayer(opts.players[1].name)],
    turn: 0,
    active: 0,
    phase: 'main',
    winner: null,
    outcome: null,
    log: [],
    rng: seed | 0,
    nextIid: 1,
    nextLogId: 1,
  };
  for (const seat of [0, 1] as Seat[]) {
    const p = s.players[seat];
    p.deck = opts.players[seat].deck.map((id) => newInstance(s, card(id).id, seat));
    shuffle(s, p.deck);
  }
  const first: Seat = opts.first ?? (Math.random() < 0.5 ? 0 : 1);
  log(s, 'info', `Duelo iniciado! ${pname(s, first)} começa.`);
  for (const seat of [0, 1] as Seat[]) {
    for (let i = 0; i < START_HAND; i++) {
      const c = s.players[seat].deck.pop();
      if (c) s.players[seat].hand.push(c);
    }
  }
  s.active = other(first);
  startTurn(s);
  return s;
}

function startTurn(s: GameState) {
  s.turn++;
  s.active = other(s.active);
  s.phase = 'main';
  const seat = s.active;
  const p = s.players[seat];
  p.summonedThisTurn = false;
  log(s, 'turn', `Turno ${s.turn} — vez de ${p.name}.`, { seat });
  if (s.turn > 1) draw(s, seat, 1);
  if (s.winner !== null) return;
  // Efeitos de início de turno (Standby).
  for (const pro of prosOf(s, seat)) {
    if (!findPro(s, pro.card.iid)) continue;
    proEffects(s, pro)?.onStandby?.(ctxFor(s, pro.card));
    if (s.winner !== null) return;
  }
  for (const sp of [...p.spells, p.field]) {
    if (sp && !sp.faceDown) effectsOf(sp.card.cardId)?.onStandby?.(ctxFor(s, sp.card));
  }
}

export function endTurn(s: GameState) {
  const p = s.players[s.active];
  while (p.hand.length > HAND_LIMIT) {
    const c = p.hand.shift()!;
    toGrave(s, c);
    log(s, 'info', `${p.name} descartou "${nameOf(c)}" (limite de ${HAND_LIMIT} cards na mão).`, { seat: s.active, cardId: c.cardId });
  }
  for (const seat of [0, 1] as Seat[]) for (const pro of prosOf(s, seat)) pro.tempAtk = 0;
  startTurn(s);
}
