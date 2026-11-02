import {
  addStress,
  bounceToHand,
  card,
  damage,
  destroyPro,
  destroySpell,
  draw,
  findPro,
  getAtk,
  heal,
  isOnce,
  log,
  markOnce,
  negatePro,
  prosOf,
  randInt,
  searchDeck,
  setCardsOf,
  setPosition,
  type BugEvent,
  type CardEffects,
  type EffectCtx,
} from '../effects/api';
import type { BugTrigger, ProSlot } from '../core/types';
import { describeBlock, describePassive } from './describe';
import { clamp, RANGES } from './rules';
import { isPassive, type EffectAction, type Condition, type EffectBlock, type EffectPart, type TargetRef } from './types';

/** O que o compilador precisa do card. */
export interface CompileCard {
  id: string;
  name: string;
  kind: 'pro' | 'task' | 'bug';
  trigger?: BugTrigger;
  effects?: readonly EffectPart[];
}

type Hook = (ctx: EffectCtx, ev?: BugEvent) => void;

/**
 * Transforma os blocos em ganchos da engine. Só usa a API de efeitos (como os cards em código),
 * é determinístico (o acaso vem do RNG da partida) e reaplica as faixas dos números.
 * Ação sem alvo é pulada com uma linha no log; nunca lança.
 */
export function compileEffects(c: CompileCard): CardEffects | undefined {
  const parts = c.effects ?? [];
  if (!parts.length) return undefined;
  const fx: CardEffects = {};
  const hooks: Partial<Record<EffectBlock['when'], Hook[]>> = {};

  for (const p of parts) {
    if (isPassive(p)) {
      applyPassive(fx, p, c);
      continue;
    }
    (hooks[p.when] ??= []).push((ctx, ev) => runBlock(ctx, p, c, ev));
  }

  const all = (list: Hook[] | undefined) => (ctx: EffectCtx) => list?.forEach((h) => h(ctx));
  const blocks = (when: EffectBlock['when']) => parts.filter((p): p is EffectBlock => !isPassive(p) && p.when === when);

  if (hooks.summon) fx.onSummon = all(hooks.summon);
  if (hooks.flip) fx.onFlip = all(hooks.flip);
  if (hooks.standby) fx.onStandby = all(hooks.standby);
  if (hooks.endTurn) fx.onEndTurn = all(hooks.endTurn);
  if (hooks.battleKill) fx.afterBattleKill = all(hooks.battleKill);
  if (hooks.destroyed) fx.onDestroyed = all(hooks.destroyed);
  if (hooks.ignition) {
    fx.onIgnite = all(hooks.ignition);
    fx.canIgnite = (ctx) =>
      blocks('ignition').every((b) => conditionsHold(ctx, b, false)) ? null : 'A condição do efeito não foi cumprida.';
  }
  if (hooks.activate) {
    fx.onActivate = all(hooks.activate);
    fx.canActivate = (ctx) =>
      blocks('activate').every((b) => conditionsHold(ctx, b, false)) ? null : 'A condição da Task não foi cumprida.';
  }
  if (hooks.bug) {
    const list = hooks.bug;
    fx.onTrigger = (ctx, ev) => list.forEach((h) => h(ctx, ev));
    // Condições fixas decidem se o Bug dispara (senão ele continua baixado); a chance só na hora.
    fx.bugCondition = (ctx) => blocks('bug').every((b) => conditionsHold(ctx, b, false));
  }
  return fx;
}

function applyPassive(fx: CardEffects, p: Extract<EffectPart, { passive: string }>, c: CompileCard) {
  switch (p.passive) {
    case 'equip': {
      const atk = clamp(p.atk, RANGES.equip);
      const def = clamp(p.def, RANGES.equip);
      fx.equip = () => ({ atk, def });
      return;
    }
    case 'aura': {
      const atk = clamp(p.atk, RANGES.aura);
      const def = clamp(p.def, RANGES.aura);
      if (p.side === 'me') fx.auraAtk = () => atk;
      else fx.oppAura = () => ({ atk, def });
      return;
    }
    case 'selfAtk': {
      const n = clamp(p.amount, RANGES.selfAtk);
      fx.atkBonus = () => n;
      return;
    }
    case 'battleSave':
      fx.saveFromBattle = (ctx) => (useOnce(ctx, 'battleSave') ? `"${c.name}": ${describePassive(p)}` : null);
      return;
    case 'shield':
      fx.shieldBattleDamage = () => true;
      return;
    case 'guard':
      fx.onTargeted = (ctx) => {
        if (!useOnce(ctx, 'guard')) return false;
        log(ctx.s, 'effect', `"${c.name}" anulou o ataque.`, { seat: ctx.me, cardId: c.id });
        return true;
      };
  }
}

/** 1x por turno, contado no próprio Profissional. */
function useOnce(ctx: EffectCtx, key: string): boolean {
  const slot = findPro(ctx.s, ctx.self.iid)?.slot;
  if (!slot || isOnce(slot.oncePerTurn, key, ctx.s.turn)) return false;
  markOnce(slot.oncePerTurn, key, ctx.s.turn);
  return true;
}

function conditionsHold(ctx: EffectCtx, b: EffectBlock, withChance: boolean): boolean {
  return (b.if ?? []).every((k) => (k.if === 'chance' ? !withChance || randInt(ctx.s, 100) < k.pct : holds(ctx, k)));
}

function holds(ctx: EffectCtx, k: Condition): boolean {
  const seat = 'side' in k && k.side === 'opp' ? ctx.opp : ctx.me;
  switch (k.if) {
    case 'stressAtLeast':
      return ctx.s.players[seat].stress >= k.n;
    case 'lpAtMost':
      return ctx.s.players[seat].lp <= k.n;
    case 'controlsAttr':
      return prosOf(ctx.s, ctx.me).some((p) => !p.faceDown && card(p.card.cardId).attribute === k.attr);
    case 'oppHasPros':
      return prosOf(ctx.s, ctx.opp).length > 0;
    case 'chance':
      return true;
  }
}

function runBlock(ctx: EffectCtx, b: EffectBlock, c: CompileCard, ev?: BugEvent) {
  if (ctx.s.winner !== null) return;
  // Condições fixas já filtraram ativação e disparo; aqui valem de novo (o estado pode ter mudado) e a chance.
  if (!conditionsHold(ctx, b, true)) {
    log(ctx.s, 'effect', `"${c.name}": a condição não se cumpriu.`, { seat: ctx.me, cardId: c.id });
    return;
  }
  log(ctx.s, 'effect', `"${c.name}": ${describeBlock(b, c)}`, { seat: ctx.me, cardId: c.id });
  for (const a of b.do) {
    if (ctx.s.winner !== null) return;
    runAction(ctx, a, c, ev);
  }
}

function pick(ctx: EffectCtx, t: TargetRef, ev?: BugEvent): ProSlot | undefined {
  const slot = (iid: string | undefined) => findPro(ctx.s, iid)?.slot;
  const byAtk = (seat: typeof ctx.me) => prosOf(ctx.s, seat).sort((a, b) => getAtk(ctx.s, seat, b) - getAtk(ctx.s, seat, a));
  switch (t) {
    case 'chosen':
      return slot(ctx.target);
    case 'self':
      return slot(ctx.self.iid);
    case 'event':
      return slot(ev?.attacker ?? ev?.summoned ?? ev?.by);
    case 'strongestOpp':
      return byAtk(ctx.opp)[0];
    case 'weakestOpp':
      return byAtk(ctx.opp).at(-1);
    case 'randomOpp': {
      const list = prosOf(ctx.s, ctx.opp);
      return list.length ? list[randInt(ctx.s, list.length)] : undefined;
    }
    case 'strongestMine':
      return byAtk(ctx.me)[0];
    case 'weakestMine':
      return byAtk(ctx.me).at(-1);
  }
}

function runAction(ctx: EffectCtx, a: EffectAction, c: CompileCard, ev?: BugEvent) {
  const { s, me, opp } = ctx;
  const target = 'target' in a ? pick(ctx, a.target, ev) : undefined;
  if ('target' in a && !target) {
    log(s, 'effect', `"${c.name}": não havia alvo.`, { seat: me, cardId: c.id });
    return;
  }
  const iid = target?.card.iid ?? '';
  switch (a.do) {
    case 'damage':
      return damage(s, opp, clamp(a.amount, RANGES.damage), c.name);
    case 'selfDamage':
      return damage(s, me, clamp(a.amount, RANGES.damage), c.name);
    case 'heal':
      return heal(s, me, clamp(a.amount, RANGES.heal));
    case 'stress': {
      const n = clamp(a.amount, RANGES.stress);
      if (a.side !== 'opp') addStress(s, me, n);
      if (a.side !== 'me') addStress(s, opp, n, n > 0);
      return;
    }
    case 'draw':
      return draw(s, me, clamp(a.amount, RANGES.draw));
    case 'search':
      if (!searchDeck(s, me, (id) => card(id).kind === a.kind)) log(s, 'effect', `"${c.name}": nada no deck.`, { seat: me });
      return;
    case 'tempAtk':
      target!.tempAtk += clamp(a.amount, RANGES.tempAtk);
      return;
    case 'modStats':
      target!.atkMod += clamp(a.atk, RANGES.modStats);
      target!.defMod += clamp(a.def, RANGES.modStats);
      return;
    case 'destroy':
      destroyPro(s, iid, { battle: false, bySeat: me });
      return;
    case 'bounce':
      return bounceToHand(s, iid);
    case 'position':
      return setPosition(s, iid, target!.position === 'atk' ? 'def' : 'atk');
    case 'negate':
      return negatePro(s, iid, s.turn + 1);
    case 'destroySet': {
      const sets = setCardsOf(s, opp);
      if (sets.length) destroySpell(s, sets[randInt(s, sets.length)].card.iid);
      else log(s, 'effect', `"${c.name}": o oponente não tinha cards virados.`, { seat: me });
      return;
    }
    case 'negateEvent':
      if (!ev) return;
      if (ev.trigger === 'battleDamage') ev.damage = 0;
      else ev.negated = true;
      return;
    case 'revealSets':
      for (const x of setCardsOf(s, opp)) x.revealed = true;
      return;
  }
}
