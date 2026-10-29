import { applyAction, card, getAtk, getDef, prosOf, tributesNeeded, type Action, type GameState, type Seat } from '@devoh/engine';
import { strongest, value } from './heuristics/board';
import { FLIP_ATK_GAIN, IGNITION_PLAYS, playCtx, SUMMON_OK, TASK_PLAYS } from './heuristics/cardPlays';

/**
 * Bot "Com IA" (normal): gera ações candidatas em ordem de prioridade e devolve
 * a primeira que o engine aceita. Sempre termina com endTurn.
 */
export function normalBotAction(s: GameState, seat: Seat): Action {
  if (s.phase === 'main') {
    for (const a of mainCandidates(s, seat)) if (applyAction(s, seat, a).ok) return a;
  } else if (s.phase === 'battle') {
    for (const a of battleCandidates(s, seat)) if (applyAction(s, seat, a).ok) return a;
  }
  return { type: 'endTurn' };
}

function mainCandidates(s: GameState, seat: Seat): Action[] {
  const out: Action[] = [];
  const ctx = playCtx(s, seat);
  const { me, opp, mine } = ctx;
  const theirs = prosOf(s, opp);
  const oppMaxAtk = Math.max(0, ...theirs.filter((p) => p.position === 'atk').map((p) => getAtk(s, opp, p)));
  const oppMaxAny = Math.max(0, ...theirs.map((p) => value(s, opp, p)));

  // 1) Efeitos de Profissionais.
  for (const p of mine) {
    const play = IGNITION_PLAYS[p.card.cardId]?.(ctx);
    if (play) out.push({ type: 'ignition', iid: p.card.iid, target: play.target });
  }

  // 2) Tasks.
  for (const c of me.hand) {
    if (card(c.cardId).kind !== 'task') continue;
    const rule = TASK_PLAYS[c.cardId];
    const play = rule ? rule(ctx) : {};
    if (play) out.push({ type: 'activate', iid: c.iid, target: play.target });
  }

  // 3) Invocação.
  if (!me.summonedThisTurn) {
    const pros = me.hand
      .filter((c) => card(c.cardId).kind === 'pro')
      .sort(
        (a, b) => (card(b.cardId).atk ?? 0) + (card(b.cardId).def ?? 0) / 2 - ((card(a.cardId).atk ?? 0) + (card(a.cardId).def ?? 0) / 2),
      );
    for (const c of pros) {
      if (SUMMON_OK[c.cardId] && !SUMMON_OK[c.cardId](ctx)) continue;
      const d = card(c.cardId);
      const need = tributesNeeded(d.level ?? 1);
      const fodder = [...mine].sort((a, b) => value(s, seat, a) - value(s, seat, b)).slice(0, need);
      if (fodder.length < need) continue;
      const fodderVal = fodder.reduce((n, p) => n + value(s, seat, p), 0);
      if (need && fodderVal >= Math.max(d.atk ?? 0, d.def ?? 0)) continue;
      const atkGuess = (d.atk ?? 0) + me.stress * 100;
      const position = atkGuess >= oppMaxAtk || (d.def ?? 0) < atkGuess ? 'atk' : 'def';
      const target = d.target === 'oppPro' ? strongest(s, opp)?.card.iid : undefined;
      out.push({ type: 'summon', iid: c.iid, position, tributes: fodder.map((p) => p.card.iid), target });
    }
  }

  // 4) Bugs virados.
  for (const c of me.hand) if (card(c.cardId).kind === 'bug') out.push({ type: 'set', iid: c.iid });

  // 5) Posições.
  for (const p of mine) {
    const atk = getAtk(s, seat, p);
    if (p.position === 'def') {
      const futureAtk = atk + (FLIP_ATK_GAIN[p.card.cardId]?.() ?? 0);
      if (futureAtk > oppMaxAny && futureAtk >= 1000 && s.turn > 1) out.push({ type: 'changePosition', iid: p.card.iid });
    } else if (atk < oppMaxAtk && getDef(s, seat, p) > atk) {
      out.push({ type: 'changePosition', iid: p.card.iid });
    }
  }

  // 6) Batalha.
  if (s.turn > 1 && mine.some((p) => p.position === 'atk')) out.push({ type: 'goBattle' });
  return out;
}

function battleCandidates(s: GameState, seat: Seat): Action[] {
  const out: Action[] = [];
  const { opp } = playCtx(s, seat);
  const attackers = prosOf(s, seat)
    .filter((p) => p.position === 'atk' && p.attackedTurn !== s.turn)
    .sort((a, b) => getAtk(s, seat, b) - getAtk(s, seat, a));
  for (const a of attackers) {
    const atk = getAtk(s, seat, a);
    const theirs = prosOf(s, opp);
    if (!theirs.length) {
      if (atk > 0) out.push({ type: 'attack', iid: a.card.iid });
      continue;
    }
    const beatable = theirs.filter((t) => atk > value(s, opp, t)).sort((x, y) => value(s, opp, y) - value(s, opp, x));
    if (beatable[0]) out.push({ type: 'attack', iid: a.card.iid, target: beatable[0].card.iid });
  }
  return out;
}
