import type { CardDef, Rarity } from '../core/types';
import type { CustomCardInput } from '../custom/types';
import { TRIGGER_TEXT, BUG_TRIGGER_TEXT, describePassive } from '../dsl/describe';
import { isPassive, type EffectAction, type EffectBlock, type EffectPart, type Passive } from '../dsl/types';
import {
  ATK_CAP_BONUS,
  BUG_TRIGGER_MULT,
  CONDITION_MULT,
  COST,
  NORMAL_BONUS,
  PASSIVE_COST,
  PRO_EFFECT_ALLOWANCE,
  SPELL_BUDGET,
  statRow,
  TRIGGER_MULT,
} from './table';

export interface ScoreLine {
  label: string;
  pts: number;
}

/** Ajuste sugerido para caber no orçamento; o botão "Aplicar" mescla o `patch` no rascunho. */
export interface Suggestion {
  label: string;
  patch: Partial<CustomCardInput>;
}

export interface CardScore {
  /** Pontos disponíveis e usados (1 ponto = 100 de ATK/DEF). */
  budget: number;
  used: number;
  /** Teto de ATK do Profissional (já com raridade e bônus de Normal). */
  atkCap?: number;
  ok: boolean;
  lines: ScoreLine[];
  problems: string[];
  suggestions: Suggestion[];
}

const RARITY_ORDER: readonly Rarity[] = ['comum', 'rara', 'super', 'ultra', 'secreta'];
const round1 = (n: number) => Math.round(n * 10) / 10;

type CostCard = Pick<CustomCardInput, 'kind' | 'trigger' | 'target'>;

/** Custo de uma ação, antes do multiplicador do gatilho. */
export function actionCost(a: EffectAction, c: CostCard): number {
  const per100 = (n: number) => Math.abs(n) / 100;
  // Mexer no ATK é a favor quando sobe o seu lado ou desce o do oponente.
  const mine = (t: string) => t === 'self' || t === 'strongestMine' || t === 'weakestMine' || (t === 'chosen' && c.target === 'ownPro');
  const theirs = (t: string) =>
    t === 'strongestOpp' || t === 'weakestOpp' || t === 'randomOpp' || t === 'event' || (t === 'chosen' && c.target === 'oppPro');
  const favor = (t: string, n: number) => (mine(t) ? n > 0 : theirs(t) ? n < 0 : true);
  switch (a.do) {
    case 'damage':
      return per100(a.amount) * COST.damagePer100;
    case 'selfDamage':
      return per100(a.amount) * COST.selfDamagePer100;
    case 'heal':
      return per100(a.amount) * COST.healPer100;
    case 'stress': {
      const n = Math.abs(a.amount);
      const up = a.amount > 0;
      if (a.side === 'opp') return n * (up ? COST.stressOppUp : COST.stressOppDown);
      if (a.side === 'me') return n * (up ? COST.stressMeUp : COST.stressMeDown);
      return n * (up ? COST.stressBothUp : COST.stressBothDown);
    }
    case 'draw':
      return a.amount * COST.draw;
    case 'search':
      return COST.search;
    case 'tempAtk': {
      const v = per100(a.amount) * COST.tempAtkPer100;
      return favor(a.target, a.amount) ? v : -v / 2;
    }
    case 'modStats': {
      const n = a.atk || a.def;
      const v = (per100(a.atk) + per100(a.def)) * COST.modStatsPer100;
      return favor(a.target, n) ? v : -v / 2;
    }
    case 'destroy':
      return destroyCost(a.target, c);
    case 'bounce':
      return destroyCost(a.target, c) * COST.bounceRatio;
    case 'position':
      return mine(a.target) ? COST.position / 2 : COST.position;
    case 'negate':
      return mine(a.target) ? -COST.negate / 2 : COST.negate;
    case 'destroySet':
      return COST.destroySet;
    case 'negateEvent':
      return COST.negateEvent;
    case 'revealSets':
      return COST.revealSets;
  }
}

function destroyCost(t: keyof typeof COST.destroy, c: CostCard) {
  if (t === 'chosen' && c.target === 'ownPro') return COST.destroy.self;
  return COST.destroy[t];
}

export function passiveCost(p: Passive): number {
  switch (p.passive) {
    case 'equip':
      return ((p.atk + p.def) / 100) * PASSIVE_COST.equipPer100;
    case 'aura':
      return ((Math.abs(p.atk) + Math.abs(p.def)) / 100) * PASSIVE_COST.auraPer100;
    case 'selfAtk':
      return (p.amount / 100) * PASSIVE_COST.selfAtkPer100;
    case 'battleSave':
      return PASSIVE_COST.battleSave;
    case 'shield':
      return PASSIVE_COST.shield;
    case 'guard':
      return PASSIVE_COST.guard;
  }
}

export function blockCost(b: EffectBlock, c: CostCard): number {
  const base = b.do.reduce((sum, a) => sum + actionCost(a, c), 0);
  const trig = b.when === 'bug' ? (c.trigger ? BUG_TRIGGER_MULT[c.trigger] : 1) : TRIGGER_MULT[b.when];
  const cond = (b.if ?? []).reduce((m, k) => m * (k.if === 'chance' ? k.pct / 100 : CONDITION_MULT), 1);
  return base * trig * cond;
}

const partCost = (p: EffectPart, c: CostCard) => (isPassive(p) ? passiveCost(p) : blockCost(p, c));

function partLabel(p: EffectPart, i: number, c: CostCard): string {
  if (isPassive(p)) return `Efeito ${i + 1}: ${describePassive(p).replace(/\.$/, '')}`;
  const head = p.when === 'bug' ? (c.trigger ? BUG_TRIGGER_TEXT[c.trigger] : 'Bug') : TRIGGER_TEXT[p.when] || 'Ao ativar';
  return `Efeito ${i + 1}: ${head}`;
}

/** Pontos dos efeitos. Um Profissional pode ganhar até 2 pontos de volta com desvantagens; Task/Bug, não. */
export function effectsCost(input: Pick<CustomCardInput, 'kind' | 'trigger' | 'target' | 'effects'>): number {
  const sum = (input.effects ?? []).reduce((s, p) => s + partCost(p, input), 0);
  return Math.max(input.kind === 'pro' ? -2 : 0, sum);
}

/**
 * Pontua o card contra a tabela: orçamento, uso, se cabe (`ok`) e o que passou.
 * A publicação exige `ok`; o rascunho pode passar. As sugestões são ajustes mínimos que cabem.
 */
export function scoreCard(input: CustomCardInput, withSuggestions = true): CardScore {
  const lines: ScoreLine[] = [];
  const problems: string[] = [];
  const effects = input.effects ?? [];
  const fxCost = effectsCost(input);
  let budget: number;
  let atkCap: number | undefined;

  if (input.kind === 'pro') {
    const level = Math.min(10, Math.max(1, input.level ?? 1));
    const row = statRow(level);
    const normal = !effects.length;
    const bonus = normal ? NORMAL_BONUS : 1;
    budget = (row.sum / 100) * bonus + (normal ? 0 : (PRO_EFFECT_ALLOWANCE[input.rarity] ?? 0));
    atkCap = Math.round(((row.atkCap + (ATK_CAP_BONUS[input.rarity] ?? 0)) * bonus) / 50) * 50;
    lines.push({ label: 'ATK + DEF', pts: ((input.atk ?? 0) + (input.def ?? 0)) / 100 });
    if ((input.atk ?? 0) > atkCap) problems.push(`ATK ${input.atk} passa do teto de ${atkCap} para nível ${level} (${input.rarity}).`);
  } else {
    budget = SPELL_BUDGET[input.rarity] ?? 0;
  }
  effects.forEach((p, i) => lines.push({ label: partLabel(p, i, input), pts: round1(partCost(p, input)) }));

  const statPts = input.kind === 'pro' ? ((input.atk ?? 0) + (input.def ?? 0)) / 100 : 0;
  const used = round1(statPts + fxCost);
  budget = round1(budget);
  if (used > budget) problems.push(`Passou do orçamento: ${used} de ${budget} pontos.`);
  const ok = problems.length === 0;
  return { budget, used, atkCap, ok, lines, problems, suggestions: ok || !withSuggestions ? [] : suggest(input, used - budget, atkCap) };
}

/** Busca ajustes de uma mudança só que fazem o card caber; no máximo 3. */
function suggest(input: CustomCardInput, over: number, atkCap: number | undefined): Suggestion[] {
  const out: Suggestion[] = [];
  const tryPatch = (label: string, patch: Partial<CustomCardInput>) => {
    if (out.length >= 3 || out.some((s) => s.label === label)) return;
    if (scoreCard({ ...input, ...patch }, false).ok) out.push({ label, patch });
  };
  const step50 = (n: number) => Math.ceil(n / 50) * 50;

  if (input.kind === 'pro') {
    const atk = input.atk ?? 0;
    const def = input.def ?? 0;
    const cut = step50(Math.max(0, over) * 100);
    if (atkCap !== undefined && atk > atkCap) {
      const extra = atk - atkCap;
      tryPatch(`ATK ${atk} → ${atkCap} e DEF ${def} → ${def + extra}`, { atk: atkCap, def: def + extra });
      tryPatch(`ATK ${atk} → ${atkCap}`, { atk: atkCap });
    }
    for (const c of [cut, cut + 50, cut + 100]) {
      const newAtk = Math.min(atk - c, atkCap ?? atk);
      if (newAtk >= 0) tryPatch(`ATK ${atk} → ${newAtk}`, { atk: newAtk });
      if (def - c >= 0) tryPatch(`DEF ${def} → ${def - c}`, { def: def - c });
    }
    for (const up of [1, 2])
      if ((input.level ?? 1) + up <= 10) tryPatch(`Nível ${input.level} → ${(input.level ?? 1) + up}`, { level: (input.level ?? 1) + up });
  }
  const r = RARITY_ORDER.indexOf(input.rarity);
  for (const next of RARITY_ORDER.slice(r + 1)) tryPatch(`Raridade ${input.rarity} → ${next}`, { rarity: next });
  const effects = input.effects ?? [];
  effects.forEach((p, i) => {
    if (isPassive(p) || p.do.length < 2) return;
    tryPatch(`Tirar a última ação do efeito ${i + 1}`, { effects: effects.map((q, j) => (j === i ? { ...p, do: p.do.slice(0, -1) } : q)) });
  });
  effects.forEach((p, i) => {
    if (isPassive(p)) return;
    const halved = p.do.map(halve);
    if (JSON.stringify(halved) !== JSON.stringify(p.do))
      tryPatch(`Reduzir os valores do efeito ${i + 1} pela metade`, {
        effects: effects.map((q, j) => (j === i ? { ...p, do: halved } : q)),
      });
  });
  return out;
}

function halve(a: EffectAction): EffectAction {
  const h = (n: number, step: number) => Math.sign(n) * Math.max(step, Math.round(Math.abs(n) / 2 / step) * step);
  switch (a.do) {
    case 'damage':
    case 'selfDamage':
    case 'heal':
      return { ...a, amount: h(a.amount, 100) };
    case 'stress':
      return { ...a, amount: h(a.amount, 1) };
    case 'tempAtk':
      return { ...a, amount: h(a.amount, 100) };
    case 'modStats':
      return { ...a, atk: a.atk && h(a.atk, 100), def: a.def && h(a.def, 100) };
    default:
      return a;
  }
}

/** Auditoria de ATK/DEF de um Profissional em código (painel de balanceamento): o que passa da curva. */
export function statAudit(def: CardDef, hasEffects: boolean): string[] {
  if (def.kind !== 'pro') return [];
  const level = def.level ?? 1;
  const row = statRow(level);
  const bonus = hasEffects ? 1 : NORMAL_BONUS;
  const atk = def.atk ?? 0;
  const dfn = def.def ?? 0;
  const limit = Math.round(row.sum * bonus);
  const cap = Math.round(((row.atkCap + ATK_CAP_BONUS[def.rarity]) * bonus) / 50) * 50;
  const over: string[] = [];
  if (atk + dfn > limit) over.push(`soma ${atk + dfn} > ${limit}`);
  if (atk > cap) over.push(`ATK ${atk} > ${cap}`);
  return over;
}
