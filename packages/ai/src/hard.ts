import {
  applyAction,
  card,
  getAtk,
  getDef,
  HIDDEN_CARD,
  MAX_STRESS,
  other,
  prosOf,
  setCardsOf,
  tributesNeeded,
  type Action,
  type GameState,
  type ProSlot,
  type Seat,
  type TargetKind,
} from '@devoh/engine';

type Policy = (s: GameState, seat: Seat) => Action;

/**
 * Bot "Sem IA" (difícil): para cada ação legal, simula o resto do turno
 * (seguindo o bot normal) e escolhe a que termina com o tabuleiro melhor.
 * Joga limpo: não enxerga os Bugs e Profissionais virados do oponente nem o
 * resultado de sorteios (cada jogada é avaliada com seeds diferentes da real).
 */
export function hardBotAction(s: GameState, seat: Seat, rollout: Policy): Action {
  const fog = fogged(s, seat);
  const candidates: Action[] = [rollout(s, seat), { type: 'endTurn' }];
  if (s.phase === 'main') {
    candidates.push(...mainActions(s, seat));
    if (s.turn > 1) candidates.push({ type: 'goBattle' });
  } else if (s.phase === 'battle') {
    candidates.push(...battleActions(s, seat));
  }

  let best: { action: Action; score: number } | null = null;
  for (const action of candidates) {
    const score = scoreAction(fog, seat, action, rollout);
    if (score !== null && (!best || score > best.score + 1)) best = { action, score };
  }
  return best?.action ?? { type: 'endTurn' };
}

const SAMPLES = 2;
const ROLLOUT_STEPS = 16;

/** Média da avaliação ao fim do turno depois de `action`; null se a ação for ilegal. */
function scoreAction(fog: GameState, seat: Seat, action: Action, rollout: Policy): number | null {
  if (action.type === 'endTurn') return evaluate(fog, seat);
  let total = 0;
  for (let k = 0; k < SAMPLES; k++) {
    const trial = { ...fog, rng: (fog.rng ^ Math.imul(k + 1, 0x9e3779b1)) | 0 };
    const r = applyAction(trial, seat, action);
    if (!r.ok) return null;
    let st = r.state;
    for (let i = 0; i < ROLLOUT_STEPS && st.winner === null && st.active === seat; i++) {
      const next = rollout(st, seat);
      if (next.type === 'endTurn') break;
      const rr = applyAction(st, seat, next);
      if (!rr.ok) break;
      st = rr.state;
    }
    total += evaluate(st, seat);
  }
  return total / SAMPLES;
}

/**
 * Cópia do estado como o bot enxerga: Bugs virados do oponente não disparam na simulação
 * e os Profissionais virados dele viram um card genérico desconhecido.
 */
function fogged(s: GameState, seat: Seat): GameState {
  const f = structuredClone(s);
  const theirs = f.players[other(seat)];
  for (const sp of theirs.spells) if (sp?.faceDown && !sp.revealed) sp.setTurn = f.turn;
  for (const pro of theirs.pros) if (pro?.faceDown) pro.card = { ...pro.card, cardId: HIDDEN_CARD.id };
  return f;
}

// ───────────── Geração de ações ─────────────

function combos<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const [head, ...rest] = arr;
  return [...combos(rest, k - 1).map((c) => [head, ...c]), ...combos(rest, k)];
}

function targetsFor(s: GameState, seat: Seat, kind: TargetKind | undefined): (string | undefined)[] {
  if (!kind) return [undefined];
  const opp = other(seat);
  if (kind === 'oppSet') return setCardsOf(s, opp).map((x) => x.card.iid);
  const ids = (who: Seat) => prosOf(s, who).map((p) => p.card.iid);
  const list = kind === 'ownPro' ? ids(seat) : kind === 'oppPro' ? ids(opp) : [...ids(seat), ...ids(opp)];
  return [undefined, ...list];
}

function mainActions(s: GameState, seat: Seat): Action[] {
  const out: Action[] = [];
  const me = s.players[seat];
  const mine = prosOf(s, seat).map((p) => p.card.iid);
  for (const c of me.hand) {
    const d = card(c.cardId);
    if (d.kind === 'pro') {
      if (me.summonedThisTurn) continue;
      for (const tributes of combos(mine, tributesNeeded(d.level ?? 1))) {
        for (const position of ['atk', 'def'] as const)
          for (const target of targetsFor(s, seat, d.target)) out.push({ type: 'summon', iid: c.iid, position, tributes, target });
        out.push({ type: 'set', iid: c.iid, tributes });
      }
    } else if (d.kind === 'task') {
      for (const target of targetsFor(s, seat, d.target)) out.push({ type: 'activate', iid: c.iid, target });
    } else {
      out.push({ type: 'set', iid: c.iid });
    }
  }
  for (const p of prosOf(s, seat)) {
    if (p.faceDown) {
      out.push({ type: 'flipSummon', iid: p.card.iid });
      continue;
    }
    out.push({ type: 'changePosition', iid: p.card.iid });
    const ig = card(p.card.cardId).ignition;
    if (ig) for (const target of targetsFor(s, seat, ig.target)) out.push({ type: 'ignition', iid: p.card.iid, target });
  }
  return out;
}

function battleActions(s: GameState, seat: Seat): Action[] {
  const out: Action[] = [];
  const theirs = prosOf(s, other(seat));
  for (const c of s.players[seat].hand) {
    const d = card(c.cardId);
    if (d.kind === 'task' && d.speed === 'quick')
      for (const target of targetsFor(s, seat, d.target)) out.push({ type: 'activate', iid: c.iid, target });
  }
  for (const p of prosOf(s, seat)) {
    if (p.position !== 'atk') continue;
    if (!theirs.length) out.push({ type: 'attack', iid: p.card.iid });
    for (const t of theirs) out.push({ type: 'attack', iid: p.card.iid, target: t.card.iid });
  }
  return out;
}

// ───────────── Avaliação do tabuleiro ─────────────

function proValue(s: GameState, seat: Seat, p: ProSlot) {
  const atk = getAtk(s, seat, p);
  const def = getDef(s, seat, p);
  return p.position === 'atk' ? atk + def * 0.25 : def * 0.9 + atk * 0.25;
}

function evaluate(s: GameState, me: Seat): number {
  const opp = other(me);
  if (s.winner === me) return 1e7;
  if (s.winner === opp) return -1e7;
  if (s.winner === 'draw') return 0;
  const P = s.players[me];
  const O = s.players[opp];
  let score = P.lp - O.lp;

  const mine = prosOf(s, me);
  const theirs = prosOf(s, opp);
  for (const p of mine) score += proValue(s, me, p);
  for (const p of theirs) score -= proValue(s, opp, p);

  score += 350 * (P.hand.length - O.hand.length);
  score += 400 * (setCardsOf(s, me).length - setCardsOf(s, opp).length);
  const persistent = (seat: Seat) => s.players[seat].spells.filter((x) => x && !x.faceDown).length + (s.players[seat].field ? 1 : 0);
  score += 300 * (persistent(me) - persistent(opp));

  const stressRisk = (x: number) => (x >= MAX_STRESS - 2 ? (x - MAX_STRESS + 3) * 600 : 0);
  score += stressRisk(O.stress) - stressRisk(P.stress);
  score -= Math.max(0, 3 - P.deck.length) * 800;

  // Ameaça do próximo turno do oponente sobre o meu campo (ou sobre os meus LP).
  if (s.active === me) {
    const oppAtks = theirs.map((p) => getAtk(s, opp, p));
    const oppMax = Math.max(0, ...oppAtks);
    if (!mine.length) score -= 0.5 * oppAtks.reduce((a, b) => a + b, 0);
    for (const p of mine) {
      const v = proValue(s, me, p);
      const guard = p.position === 'atk' ? getAtk(s, me, p) : getDef(s, me, p);
      if (oppMax > guard) score -= 0.5 * v + (p.position === 'atk' ? 0.5 * (oppMax - guard) : 0);
    }
  }
  return score;
}
