import { card, tributesNeeded } from './cards';
import './effects';
import {
  addStress,
  checkWin,
  ctxFor,
  damage,
  destroyPro,
  draw,
  findPro,
  findSpell,
  fireBugs,
  getAtk,
  getDef,
  HAND_LIMIT,
  isOnce,
  log,
  markOnce,
  nameOf,
  newInstance,
  newProSlot,
  other,
  pname,
  proOnField,
  prosOf,
  setCardsOf,
  setPosition,
  shuffle,
  START_LP,
  toGrave,
  tribute,
  ZONES,
} from './ops';
import { EFFECTS } from './registry';
import type { Action, ActionResult, GameState, PlayerState, ProSlot, Seat, TargetKind } from './types';

export const START_HAND = 4;

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
    EFFECTS[pro.card.cardId]?.onStandby?.(ctxFor(s, pro.card));
    if (s.winner !== null) return;
  }
  for (const sp of [...p.spells, p.field]) {
    if (sp && !sp.faceDown) EFFECTS[sp.card.cardId]?.onStandby?.(ctxFor(s, sp.card));
  }
}

function endTurn(s: GameState) {
  const p = s.players[s.active];
  while (p.hand.length > HAND_LIMIT) {
    const c = p.hand.shift()!;
    toGrave(s, c);
    log(s, 'info', `${p.name} descartou "${nameOf(c)}" (limite de ${HAND_LIMIT} cards na mão).`, { seat: s.active, cardId: c.cardId });
  }
  for (const seat of [0, 1] as Seat[]) for (const pro of prosOf(s, seat)) pro.tempAtk = 0;
  startTurn(s);
}

// ───────────── Validação de alvos ─────────────

function validTarget(s: GameState, me: Seat, kind: TargetKind, iid: string | undefined): boolean {
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

function hasAnyTarget(s: GameState, me: Seat, kind: TargetKind): boolean {
  if (kind === 'oppSet') return setCardsOf(s, other(me)).length > 0;
  if (kind === 'ownPro') return prosOf(s, me).length > 0;
  if (kind === 'oppPro') return prosOf(s, other(me)).length > 0;
  return prosOf(s, 0).length + prosOf(s, 1).length > 0;
}

/** Tasks em que o alvo é obrigatório (sem alvo não fazem nada útil). */
const REQUIRED_TARGET = new Set(['refatoracao', 'hotfix', 'thy_revisor', 'copilot']);

// ───────────── Ações ─────────────

export function applyAction(state: GameState, seat: Seat, action: Action): ActionResult {
  const s = structuredClone(state);
  const err = run(s, seat, action);
  if (err) return { ok: false, error: err };
  checkWin(s);
  return { ok: true, state: s };
}

function run(s: GameState, seat: Seat, a: Action): string | null {
  if (s.winner !== null) return 'O duelo já acabou.';
  if (a.type === 'surrender') {
    log(s, 'info', `${pname(s, seat)} desistiu… pediu as contas.`, { seat });
    s.winner = other(seat);
    s.phase = 'ended';
    log(s, 'win', `${pname(s, s.winner)} venceu o duelo!`, { seat: s.winner });
    return null;
  }
  if (seat !== s.active) return 'Não é o seu turno.';
  const p = s.players[seat];
  const opp = other(seat);

  switch (a.type) {
    case 'summon': {
      if (s.phase !== 'main') return 'Só dá para invocar na Fase Principal.';
      if (p.summonedThisTurn) return 'Você já invocou neste turno.';
      const hi = p.hand.findIndex((c) => c.iid === a.iid);
      if (hi < 0) return 'Card não está na sua mão.';
      const c = p.hand[hi];
      const d = card(c.cardId);
      if (d.kind !== 'pro') return 'Só Profissionais podem ser invocados.';
      const need = tributesNeeded(d.level ?? 1);
      const tribs = [...new Set(a.tributes ?? [])];
      if (tribs.length !== need) return need ? `Precisa sacrificar ${need} Profissional(is).` : 'Este card não precisa de sacrifício.';
      for (const t of tribs) {
        const f = findPro(s, t);
        if (!f || f.seat !== seat) return 'Sacrifício inválido.';
      }
      const freeAfter = p.pros.filter((x) => !x).length + tribs.length;
      if (freeAfter < 1) return 'Sem zona livre para Profissionais.';
      if (d.target && a.target && !validTarget(s, seat, d.target, a.target)) return 'Alvo inválido.';
      for (const t of tribs) tribute(s, t);
      p.hand.splice(hi, 1);
      const zone = p.pros.findIndex((x) => !x);
      p.pros[zone] = newProSlot(c, a.position, s.turn);
      p.summonedThisTurn = true;
      log(s, 'summon', `${p.name} invocou "${d.name}" em ${a.position === 'atk' ? 'Ataque' : 'Defesa'}.`, { seat, cardId: d.id });
      fireBugs(s, opp, ['oppSummon'], { trigger: 'oppSummon', summoned: c.iid });
      if (findPro(s, c.iid) && s.winner === null) EFFECTS[d.id]?.onSummon?.(ctxFor(s, c, a.target));
      return null;
    }

    case 'activate': {
      if (s.phase !== 'main') return 'Tasks só na Fase Principal.';
      if (p.shockedUntilTurn >= s.turn) return 'Você está Chocado e não pode ativar Tasks!';
      const hi = p.hand.findIndex((c) => c.iid === a.iid);
      if (hi < 0) return 'Card não está na sua mão.';
      const c = p.hand[hi];
      const d = card(c.cardId);
      if (d.kind !== 'task') return 'Esse card não é uma Task.';
      const fx = EFFECTS[d.id];
      const ctx = ctxFor(s, c, a.target);
      const cant = fx?.canActivate?.(ctx);
      if (cant) return cant;
      if (d.target) {
        if (REQUIRED_TARGET.has(d.id) && !validTarget(s, seat, d.target, a.target)) return 'Escolha um alvo válido.';
        if (a.target && !validTarget(s, seat, d.target, a.target)) return 'Alvo inválido.';
      }
      if (d.speed === 'continuous' && !p.spells.some((x) => !x)) return 'Sem zona livre para Tasks/Bugs.';
      p.hand.splice(hi, 1);
      log(s, 'task', `${p.name} ativou a Task "${d.name}".`, { seat, cardId: d.id });
      const ev = fireBugs(s, opp, ['oppTask'], { trigger: 'oppTask', task: c.iid });
      if (ev.negated) {
        toGrave(s, c);
        log(s, 'effect', `"${d.name}" foi anulada.`, { seat });
        return null;
      }
      if (d.speed === 'field') {
        if (p.field) {
          toGrave(s, p.field.card);
          log(s, 'info', `"${nameOf(p.field.card)}" saiu de campo.`, { seat });
        }
        p.field = { card: c, faceDown: false, revealed: true, setTurn: s.turn };
      } else if (d.speed === 'continuous') {
        p.spells[p.spells.findIndex((x) => !x)] = { card: c, faceDown: false, revealed: true, setTurn: s.turn };
      }
      fx?.onActivate?.(ctx);
      if (d.speed === 'normal' || !d.speed) toGrave(s, c);
      return null;
    }

    case 'set': {
      if (s.phase !== 'main') return 'Só dá para baixar cards na Fase Principal.';
      const hi = p.hand.findIndex((c) => c.iid === a.iid);
      if (hi < 0) return 'Card não está na sua mão.';
      const c = p.hand[hi];
      if (card(c.cardId).kind !== 'bug') return 'Só Bugs podem ser baixados virados.';
      const z = p.spells.findIndex((x) => !x);
      if (z < 0) return 'Sem zona livre para Tasks/Bugs.';
      p.hand.splice(hi, 1);
      p.spells[z] = { card: c, faceDown: true, revealed: false, setTurn: s.turn };
      log(s, 'info', `${p.name} baixou um Bug virado.`, { seat });
      return null;
    }

    case 'changePosition': {
      if (s.phase !== 'main') return 'Mude posições na Fase Principal.';
      const f = findPro(s, a.iid);
      if (!f || f.seat !== seat) return 'Profissional inválido.';
      const err = positionBlock(s, f.slot);
      if (err) return err;
      f.slot.changedPosTurn = s.turn;
      const to = f.slot.position === 'atk' ? 'def' : 'atk';
      log(s, 'info', `"${nameOf(f.slot.card)}" mudou para ${to === 'atk' ? 'Ataque' : 'Defesa'}.`, { seat, cardId: f.slot.card.cardId });
      setPosition(s, a.iid, to);
      return null;
    }

    case 'ignition': {
      if (s.phase !== 'main') return 'Efeitos só na Fase Principal.';
      const f = findPro(s, a.iid);
      if (!f || f.seat !== seat) return 'Profissional inválido.';
      const d = card(f.slot.card.cardId);
      if (!d.ignition) return 'Este card não tem efeito ativável.';
      if (f.slot.ignitionTurn === s.turn) return 'Efeito já usado neste turno.';
      const ctx = ctxFor(s, f.slot.card, a.target);
      const cant = EFFECTS[d.id]?.canIgnite?.(ctx);
      if (cant) return cant;
      if (d.ignition.target && !validTarget(s, seat, d.ignition.target, a.target)) return 'Escolha um alvo válido.';
      f.slot.ignitionTurn = s.turn;
      EFFECTS[d.id]?.onIgnite?.(ctx);
      return null;
    }

    case 'goBattle': {
      if (s.phase !== 'main') return 'Você já está na Batalha.';
      if (s.turn === 1) return 'Não tem Batalha no primeiro turno do duelo.';
      s.phase = 'battle';
      log(s, 'info', `${p.name} entrou na Fase de Batalha.`, { seat });
      return null;
    }

    case 'attack':
      return attack(s, seat, a.iid, a.target);

    case 'endTurn':
      endTurn(s);
      return null;
  }
}

export function positionBlock(s: GameState, slot: ProSlot): string | null {
  if (slot.summonedTurn === s.turn) return 'Não pode mudar a posição no turno em que foi invocado.';
  if (slot.changedPosTurn === s.turn) return 'Já mudou de posição neste turno.';
  if (slot.attackedTurn === s.turn) return 'Já atacou neste turno.';
  if (slot.lockedUntilTurn >= s.turn) return 'Está encantado e não pode mudar de posição.';
  return null;
}

export function attackBlock(s: GameState, seat: Seat, slot: ProSlot): string | null {
  if (s.phase !== 'battle') return 'Entre na Fase de Batalha primeiro.';
  if (slot.position !== 'atk') return 'Só Profissionais em Ataque podem atacar.';
  if (slot.attackedTurn === s.turn) return 'Já atacou neste turno.';
  if (s.players[seat].noAttackTurn === s.turn) return 'Seu time está de férias neste turno.';
  return null;
}

// ───────────── Batalha ─────────────

function attack(s: GameState, seat: Seat, iid: string, targetIid?: string): string | null {
  const opp = other(seat);
  const f = findPro(s, iid);
  if (!f || f.seat !== seat) return 'Atacante inválido.';
  const block = attackBlock(s, seat, f.slot);
  if (block) return block;
  const oppPros = prosOf(s, opp);
  let target: ProSlot | null = null;
  if (oppPros.length) {
    const t = findPro(s, targetIid);
    if (!t || t.seat !== opp) return 'Escolha um Profissional do oponente para atacar.';
    target = t.slot;
  } else if (targetIid) return 'Alvo inválido.';

  f.slot.attackedTurn = s.turn;
  const A = f.slot;
  log(
    s,
    'attack',
    target ? `"${nameOf(A.card)}" atacou "${nameOf(target.card)}"!` : `"${nameOf(A.card)}" atacou diretamente!`,
    { seat, cardId: A.card.cardId },
  );

  // Respostas do defensor: Kelly, Thy Tech Lead, Bugs.
  const kelly = proOnField(s, opp, 'kelly');
  if (kelly && !isOnce(kelly.oncePerTurn, 'cuidado', s.turn)) {
    markOnce(kelly.oncePerTurn, 'cuidado', s.turn);
    log(s, 'effect', 'Kelly: "CUIDADO…" — o ataque foi negado.', { seat: opp, cardId: 'kelly' });
    return null;
  }
  if (target?.card.cardId === 'thy_techlead' && !isOnce(target.oncePerTurn, 'laele', s.turn)) {
    markOnce(target.oncePerTurn, 'laele', s.turn);
    log(s, 'effect', 'Thy: "LÁ ELE!" — repassou a bucha para outro departamento. Ataque anulado.', { seat: opp, cardId: 'thy_techlead' });
    return null;
  }
  const triggers = target ? (['oppAttack'] as const) : (['oppAttack', 'oppDirectAttack'] as const);
  const ev = fireBugs(s, opp, [...triggers], {
    trigger: target ? 'oppAttack' : 'oppDirectAttack',
    attacker: A.card.iid,
    target: target?.card.iid,
  });
  if (ev.negated || s.winner !== null) return null;
  if (!findPro(s, A.card.iid)) return null;
  if (target && !findPro(s, target.card.iid)) return null;

  if (A.card.cardId === 'douglas_ataque') {
    log(s, 'effect', '"Peteco Peteco!"', { seat, cardId: 'douglas_ataque' });
    addStress(s, opp, 1, true);
  }

  const atkA = getAtk(s, seat, A);
  if (!target) {
    battleDamage(s, opp, atkA, [A]);
    return null;
  }
  const involved = [A, target];
  if (target.position === 'atk') {
    const atkT = getAtk(s, opp, target);
    if (atkA > atkT) {
      const destroyed = battleDestroy(s, target, A);
      battleDamage(s, opp, atkA - atkT, involved);
      if (destroyed) afterKill(s, seat, A);
    } else if (atkA < atkT) {
      battleDestroy(s, A, target);
      battleDamage(s, seat, atkT - atkA, involved);
    } else if (atkA > 0) {
      battleDestroy(s, A, target);
      battleDestroy(s, target, A);
    }
  } else {
    const defT = getDef(s, opp, target);
    if (atkA > defT) {
      if (battleDestroy(s, target, A)) afterKill(s, seat, A);
    } else if (atkA < defT) {
      battleDamage(s, seat, defT - atkA, involved);
    }
  }
  // Wisley "MESMO… (Revanche)": aguentou o ataque, acumula rancor.
  if (target.card.cardId === 'wisley' && findPro(s, target.card.iid) && s.winner === null) {
    target.atkMod += 500;
    log(s, 'effect', 'Wisley: "Não tá fácil… MESMO." — acumulou rancor: +500 ATK permanente.', { seat: opp, cardId: 'wisley' });
  }
  return null;
}

function indestructibleInBattle(s: GameState, slot: ProSlot): string | null {
  const id = slot.card.cardId;
  if (id === 'douglas_defensivo') return 'Douglas: "SOCORRO!" — não foi destruído.';
  if (id === 'thy_filosofo' && slot.position === 'def') return 'Thy sumiu na sexta-feira: não foi destruído.';
  if (id === 'wisley' && !isOnce(slot.oncePerTurn, 'naotafacil', s.turn)) {
    markOnce(slot.oncePerTurn, 'naotafacil', s.turn);
    return 'Wisley: "Não tá fácil… mesmo." — aguentou a pancada.';
  }
  return null;
}

/** Destrói `victim` em batalha contra `by`. Retorna true se destruiu. */
function battleDestroy(s: GameState, victim: ProSlot, by: ProSlot): boolean {
  const f = findPro(s, victim.card.iid);
  if (!f) return false;
  const saved = indestructibleInBattle(s, victim);
  if (saved) {
    log(s, 'effect', saved, { seat: f.seat, cardId: victim.card.cardId });
    return false;
  }
  const ok = destroyPro(s, victim.card.iid, { battle: true, byIid: by.card.iid });
  if (ok) fireBugs(s, f.seat, ['proDestroyedByBattle'], { trigger: 'proDestroyedByBattle', destroyed: victim.card.iid, by: by.card.iid });
  return ok;
}

function afterKill(s: GameState, seat: Seat, killer: ProSlot) {
  if (!findPro(s, killer.card.iid)) return;
  if (killer.card.cardId === 'douglas_ataque') damage(s, other(seat), 500, 'Peteco Peteco');
  if (killer.card.cardId === 'qa') addStress(s, other(seat), 1, true);
  if (killer.card.cardId === 'wisley') {
    log(s, 'effect', 'Wisley desabafou na daily: o oponente ganha +2 de Estresse.', { seat, cardId: 'wisley' });
    addStress(s, other(seat), 2, true);
  }
}

function battleDamage(s: GameState, seat: Seat, amount: number, involved: ProSlot[]) {
  if (amount <= 0 || s.winner !== null) return;
  if (involved.some((x) => x.card.cardId === 'wisley' && x.card.owner === seat)) {
    log(s, 'effect', 'Wisley segurou o tranco: nenhum dano de batalha.', { seat, cardId: 'wisley' });
    return;
  }
  const p = s.players[seat];
  if (proOnField(s, seat, 'danilo') && !isOnce(p.oncePerTurn, 'foiOClaude', s.turn)) {
    markOnce(p.oncePerTurn, 'foiOClaude', s.turn);
    log(s, 'effect', 'Danilo: "Foi o Claude!" — a culpa foi pra IA, dano anulado.', { seat, cardId: 'danilo' });
    return;
  }
  const ev = fireBugs(s, seat, ['battleDamage'], { trigger: 'battleDamage', damage: amount });
  const final = ev.damage ?? amount;
  if (final <= 0) return;
  damage(s, seat, final);
  addStress(s, seat, 1);
}
