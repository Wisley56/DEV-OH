import { card } from './cards';
import { EFFECTS, type BugEvent, type EffectCtx } from './registry';
import type {
  BugTrigger,
  CardInstance,
  GameState,
  LogEntry,
  LogKind,
  ProSlot,
  Seat,
  SpellSlot,
} from './types';

export const START_LP = 4000;
export const MAX_STRESS = 10;
export const STRESS_AFTER_MELTDOWN = 5;
export const ZONES = 3;
export const HAND_LIMIT = 7;
export const MAX_LOG = 200;

export const other = (seat: Seat): Seat => (seat === 0 ? 1 : 0);

/** mulberry32 — estado guardado no próprio GameState para ser determinístico. */
export function rand(s: GameState): number {
  s.rng = (s.rng + 0x6d2b79f5) | 0;
  let t = s.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function randInt(s: GameState, n: number): number {
  return Math.floor(rand(s) * n);
}

export function shuffle<T>(s: GameState, arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randInt(s, i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function log(s: GameState, kind: LogKind, text: string, extra: Partial<LogEntry> = {}) {
  s.log.push({ id: s.nextLogId++, kind, text, ...extra });
  if (s.log.length > MAX_LOG) s.log.splice(0, s.log.length - MAX_LOG);
}

export function newInstance(s: GameState, cardId: string, owner: Seat): CardInstance {
  return { iid: `c${s.nextIid++}`, cardId, owner };
}

export const nameOf = (c: CardInstance | string) => card(typeof c === 'string' ? c : c.cardId).name;
export const pname = (s: GameState, seat: Seat) => s.players[seat].name;

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
export const setCardsOf = (s: GameState, seat: Seat) =>
  s.players[seat].spells.filter((x): x is SpellSlot => !!x && x.faceDown);

export function proOnField(s: GameState, seat: Seat, cardId: string): ProSlot | undefined {
  return prosOf(s, seat).find((p) => p.card.cardId === cardId);
}

export function hasFaceUp(s: GameState, seat: Seat, cardId: string): boolean {
  const p = s.players[seat];
  if (p.field?.card.cardId === cardId) return true;
  return p.spells.some((x) => x && !x.faceDown && x.card.cardId === cardId);
}

export function isOnce(rec: Record<string, number>, key: string, turn: number) {
  return rec[key] === turn;
}
export function markOnce(rec: Record<string, number>, key: string, turn: number) {
  rec[key] = turn;
}

// ───────────── Status calculados ─────────────

export function getAtk(s: GameState, seat: Seat, slot: ProSlot): number {
  const d = card(slot.card.cardId);
  const p = s.players[seat];
  let base = d.atk ?? 0;
  if (d.id === 'danilo' && hasFaceUp(s, seat, 'leite')) base *= 2;
  let atk = base + slot.atkMod + slot.tempAtk;
  atk += p.stress * 100; // Modo Desespero
  if (d.id === 'douglas_calma') atk += p.stress * 200;
  if (d.id === 'thy_techlead') atk += 300 * (prosOf(s, seat).length - 1);
  if (d.id === 'douglas_ataque' && (hasFaceUp(s, seat, 'gato_gordo') || hasFaceUp(s, other(seat), 'gato_gordo')))
    atk += 800;
  if (hasFaceUp(s, seat, 'gato_gordo')) atk += 300;
  if (hasFaceUp(s, seat, 'leite') && d.attribute === 'TERRA') atk += 300;
  return Math.max(0, atk);
}

export function getDef(_s: GameState, _seat: Seat, slot: ProSlot): number {
  return Math.max(0, (card(slot.card.cardId).def ?? 0) + slot.defMod);
}

// ───────────── Vitória ─────────────

export function checkWin(s: GameState) {
  if (s.winner !== null) return;
  const dead = ([0, 1] as Seat[]).filter((seat) => s.players[seat].lp <= 0);
  if (dead.length === 2) s.winner = 'draw';
  else if (dead.length === 1) s.winner = other(dead[0]);
  if (s.winner !== null) {
    s.phase = 'ended';
    log(s, 'win', s.winner === 'draw' ? 'Empate! A sprint acabou para todo mundo.' : `${pname(s, s.winner)} entregou a Sprint e venceu o duelo!`, {
      seat: s.winner === 'draw' ? undefined : s.winner,
    });
  }
}

export function lose(s: GameState, seat: Seat, why: string) {
  if (s.winner !== null) return;
  log(s, 'info', why, { seat });
  s.winner = other(seat);
  s.phase = 'ended';
  log(s, 'win', `${pname(s, s.winner)} venceu o duelo!`, { seat: s.winner });
}

// ───────────── Operações básicas ─────────────

export function draw(s: GameState, seat: Seat, n = 1) {
  const p = s.players[seat];
  for (let i = 0; i < n; i++) {
    const c = p.deck.pop();
    if (!c) {
      lose(s, seat, `${p.name} não tem mais cards no deck — backlog vazio, projeto cancelado.`);
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

export function damage(s: GameState, seat: Seat, amount: number, why = '') {
  if (amount <= 0 || s.winner !== null) return;
  s.players[seat].lp = Math.max(0, s.players[seat].lp - amount);
  log(s, 'damage', `${pname(s, seat)} perdeu ${amount} LP${why ? ` (${why})` : ''}.`, { seat, amount });
  checkWin(s);
}

export function heal(s: GameState, seat: Seat, amount: number) {
  if (amount <= 0) return;
  s.players[seat].lp += amount;
  log(s, 'heal', `${pname(s, seat)} recuperou ${amount} LP.`, { seat, amount });
}

/**
 * Altera o Estresse. byOpponent = o aumento vem de um efeito do oponente
 * (permite o "E quem disse que isso é problema meu?" do Douglas).
 */
export function addStress(s: GameState, seat: Seat, n: number, byOpponent = false) {
  if (n === 0 || s.winner !== null) return;
  const p = s.players[seat];
  if (n > 0 && byOpponent) {
    const dp = proOnField(s, seat, 'douglas_problemas');
    if (dp && !isOnce(dp.oncePerTurn, 'problemas', s.turn)) {
      markOnce(dp.oncePerTurn, 'problemas', s.turn);
      log(s, 'effect', `Douglas: "E quem disse que isso é problema meu?" — o Estresse volta para ${pname(s, other(seat))}.`, {
        seat,
        cardId: 'douglas_problemas',
      });
      addStress(s, other(seat), n, false);
      return;
    }
  }
  const before = p.stress;
  p.stress = Math.max(0, Math.min(MAX_STRESS, p.stress + n));
  if (p.stress === before) return;
  log(s, 'stress', `Estresse de ${p.name}: ${before} → ${p.stress}.`, { seat, amount: p.stress - before });
  if (p.stress >= MAX_STRESS) meltdown(s, seat);
}

/** Estresse no máximo: o Profissional de maior nível pede demissão. */
function meltdown(s: GameState, seat: Seat) {
  const p = s.players[seat];
  const victims = prosOf(s, seat).sort((a, b) => (card(b.card.cardId).level ?? 0) - (card(a.card.cardId).level ?? 0));
  log(s, 'stress', `${p.name} chegou no limite do Estresse!`, { seat });
  p.stress = STRESS_AFTER_MELTDOWN;
  if (victims[0]) {
    log(s, 'destroy', `"${nameOf(victims[0].card)}" pediu demissão!`, { seat, cardId: victims[0].card.cardId });
    destroyPro(s, victims[0].card.iid, { battle: false, self: true });
  }
}

export function toGrave(s: GameState, c: CardInstance) {
  s.players[c.owner].grave.push(c);
}

function removePro(s: GameState, iid: string): ProSlot | null {
  const f = findPro(s, iid);
  if (!f) return null;
  s.players[f.seat].pros[f.idx] = null;
  return f.slot;
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
  if (!cause.self && !cause.battle && cause.bySeat !== undefined && cause.bySeat !== f.seat && id === 'douglas_defensivo') {
    log(s, 'effect', 'Douglas (Modo Defensivo): "SOCORRO! SOCORRO!" — saiu da call e ficou imune.', { seat: f.seat, cardId: id });
    return false;
  }
  removePro(s, iid);
  toGrave(s, f.slot.card);
  if (!cause.self) log(s, 'destroy', `"${nameOf(id)}" foi destruído.`, { seat: f.seat, cardId: id });
  const fx = EFFECTS[id];
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
  log(s, 'destroy', `"${nameOf(f.slot.card)}" foi destruído.`, { seat: f.seat, cardId: f.slot.card.cardId });
  return true;
}

export function bounceToHand(s: GameState, iid: string) {
  const f = findPro(s, iid);
  if (!f) return;
  removePro(s, iid);
  s.players[f.slot.card.owner].hand.push(f.slot.card);
  log(s, 'effect', `"${nameOf(f.slot.card)}" voltou para a mão.`, { seat: f.seat, cardId: f.slot.card.cardId });
}

/** Muda posição e aplica a transformação do par Douglas Ataque/Defensivo. */
export function setPosition(s: GameState, iid: string, pos: 'atk' | 'def') {
  const f = findPro(s, iid);
  if (!f || f.slot.position === pos) return;
  f.slot.position = pos;
  const id = f.slot.card.cardId;
  if (id === 'douglas_ataque' && pos === 'def') transform(s, f.slot, 'douglas_defensivo');
  else if (id === 'douglas_defensivo' && pos === 'atk') transform(s, f.slot, 'douglas_ataque');
}

function transform(s: GameState, slot: ProSlot, to: string) {
  const from = slot.card.cardId;
  slot.card = { ...slot.card, cardId: to };
  log(s, 'effect', `"${nameOf(from)}" virou "${nameOf(to)}"!`, { seat: slot.card.owner, cardId: to });
}

export function ctxFor(s: GameState, self: CardInstance, target?: string): EffectCtx {
  // Para cards no campo o "me" é quem controla; usamos o dono (não há troca de controle no jogo).
  return { s, me: self.owner, opp: other(self.owner), self, target };
}

/**
 * Dispara o primeiro Bug virado do `defender` que responde a um dos triggers.
 * Retorna o evento (possivelmente negado/alterado).
 */
export function fireBugs(s: GameState, defender: Seat, triggers: BugTrigger[], ev: BugEvent): BugEvent {
  const p = s.players[defender];
  if (s.winner !== null) return ev;
  if (p.shockedUntilTurn >= s.turn) return ev;
  for (let i = 0; i < p.spells.length; i++) {
    const slot = p.spells[i];
    if (!slot || !slot.faceDown || slot.setTurn === s.turn) continue;
    const d = card(slot.card.cardId);
    if (d.kind !== 'bug' || !d.trigger || !triggers.includes(d.trigger)) continue;
    const fx = EFFECTS[d.id];
    const ctx = ctxFor(s, slot.card);
    if (fx?.bugCondition && !fx.bugCondition(ctx, ev)) continue;
    p.spells[i] = null;
    toGrave(s, slot.card);
    log(s, 'bug', `${p.name} ativou o Bug "${d.name}"!`, { seat: defender, cardId: d.id });
    // Modo Revisor: qualquer Bug ativado irrita o Thy.
    for (const seat of [0, 1] as Seat[]) {
      for (const pro of prosOf(s, seat)) {
        if (pro.card.cardId === 'thy_revisor') {
          pro.tempAtk += 500;
          log(s, 'effect', 'Thy entrou no Modo Revisor: +500 ATK até o fim do turno.', { seat, cardId: 'thy_revisor' });
        }
      }
    }
    fx?.onTrigger?.(ctx, ev);
    break;
  }
  return ev;
}
