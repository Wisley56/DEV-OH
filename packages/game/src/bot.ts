import { card, tributesNeeded } from './cards';
import { applyAction } from './engine';
import { getAtk, getDef, other, prosOf, setCardsOf } from './ops';
import type { Action, GameState, ProSlot, Seat } from './types';

/**
 * Bot heurístico: gera ações candidatas em ordem de prioridade e devolve
 * a primeira que o engine aceita. Sempre termina com endTurn.
 */
export function botAction(s: GameState, seat: Seat): Action {
  if (s.phase === 'main') {
    for (const a of mainCandidates(s, seat)) if (applyAction(s, seat, a).ok) return a;
  } else if (s.phase === 'battle') {
    for (const a of battleCandidates(s, seat)) if (applyAction(s, seat, a).ok) return a;
  }
  return { type: 'endTurn' };
}

const value = (s: GameState, seat: Seat, p: ProSlot) => (p.position === 'atk' ? getAtk(s, seat, p) : getDef(s, seat, p));

function strongest(s: GameState, seat: Seat, filter: (p: ProSlot) => boolean = () => true) {
  return prosOf(s, seat)
    .filter(filter)
    .sort((a, b) => value(s, seat, b) - value(s, seat, a))[0];
}

function mainCandidates(s: GameState, seat: Seat): Action[] {
  const out: Action[] = [];
  const me = s.players[seat];
  const opp = other(seat);
  const oppP = s.players[opp];
  const mine = prosOf(s, seat);
  const theirs = prosOf(s, opp);
  const oppMaxAtk = Math.max(0, ...theirs.filter((p) => p.position === 'atk').map((p) => getAtk(s, opp, p)));
  const oppMaxAny = Math.max(0, ...theirs.map((p) => value(s, opp, p)));

  // 1) Efeitos de Profissionais.
  for (const p of mine) {
    const id = p.card.cardId;
    if (id === 'thy_revisor') {
      const ia = strongest(s, opp, (x) => card(x.card.cardId).tags?.includes('ia') ?? false);
      if (ia) out.push({ type: 'ignition', iid: p.card.iid, target: ia.card.iid });
    }
    if (id === 'thy_filosofo' && me.stress >= 2) out.push({ type: 'ignition', iid: p.card.iid });
    if (id === 'moises' && me.stress >= 5) out.push({ type: 'ignition', iid: p.card.iid });
    if (id === 'copilot' && s.turn > 1) {
      const best = strongest(s, seat, (x) => x.position === 'atk');
      if (best) out.push({ type: 'ignition', iid: p.card.iid, target: best.card.iid });
    }
  }

  // 2) Tasks.
  for (const c of me.hand) {
    const d = card(c.cardId);
    if (d.kind !== 'task') continue;
    const act = (target?: string) => out.push({ type: 'activate', iid: c.iid, target });
    switch (d.id) {
      case 'code_review':
      case 'chama_thy':
        if (me.deck.length > 4) act();
        break;
      case 'cafe':
        if (me.stress >= 3) act(strongest(s, seat, (x) => x.position === 'atk')?.card.iid);
        break;
      case 'home_office':
        if (me.stress >= 2 || me.lp <= 2500) act();
        break;
      case 'ferias':
        if (me.stress >= 7) act();
        break;
      case 'refatoracao': {
        const t = strongest(s, opp);
        if (t && value(s, opp, t) >= 1700 && me.stress <= 6) act(t.card.iid);
        break;
      }
      case 'hotfix': {
        const sets = setCardsOf(s, opp);
        if (sets.length) act(sets[0].card.iid);
        break;
      }
      case 'reuniao': {
        const t = strongest(s, opp, (x) => x.position === 'atk');
        if (t || oppP.stress >= 6) act(t?.card.iid);
        break;
      }
      case 'daily':
        if (oppP.stress > me.stress && me.stress <= 6) act();
        break;
      case 'leite':
        if ([...me.hand, ...mine.map((m) => m.card)].some((x) => x.cardId === 'danilo' || card(x.cardId).attribute === 'TERRA')) act();
        break;
      case 'gato_gordo':
        if (!me.field) act();
        break;
      case 'deploy_sexta':
        if (oppP.lp <= 3000 || me.lp < oppP.lp - 1500) act();
        break;
      default:
        act();
    }
  }

  // 3) Invocação.
  if (!me.summonedThisTurn) {
    const pros = me.hand
      .filter((c) => card(c.cardId).kind === 'pro')
      .sort((a, b) => (card(b.cardId).atk ?? 0) + (card(b.cardId).def ?? 0) / 2 - ((card(a.cardId).atk ?? 0) + (card(a.cardId).def ?? 0) / 2));
    for (const c of pros) {
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
      const futureAtk = p.card.cardId === 'douglas_defensivo' ? atk + (card('douglas_ataque').atk ?? 0) : atk;
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
  const opp = other(seat);
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
    const beatable = theirs
      .filter((t) => atk > value(s, opp, t))
      .sort((x, y) => value(s, opp, y) - value(s, opp, x));
    if (beatable[0]) out.push({ type: 'attack', iid: a.card.iid, target: beatable[0].card.iid });
  }
  return out;
}
