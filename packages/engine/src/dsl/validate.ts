import type { Attribute, BugTrigger, CardKind, TargetKind, TaskSpeed } from '../core/types';
import {
  CHANCES,
  EVENT_TARGET,
  inRange,
  MAX_ACTIONS,
  MAX_CONDITIONS,
  MAX_PARTS,
  NEGATABLE,
  passivesFor,
  RANGES,
  targetOf,
  triggersFor,
} from './rules';
import { isPassive, type EffectAction, type Condition, type EffectPart, type TargetRef } from './types';

export interface EffectsCard {
  kind: CardKind;
  speed?: TaskSpeed;
  trigger?: BugTrigger;
  target?: TargetKind;
  effects?: readonly EffectPart[];
}

const TARGETS: readonly TargetRef[] = [
  'chosen',
  'self',
  'event',
  'strongestOpp',
  'weakestOpp',
  'randomOpp',
  'strongestMine',
  'weakestMine',
];
const ATTRS: readonly Attribute[] = ['TREVA', 'AGUA', 'TERRA', 'FOGO', 'LUZ', 'TECH'];
const KINDS: readonly CardKind[] = ['pro', 'task', 'bug'];
const CHOSEN_KINDS: readonly TargetKind[] = ['ownPro', 'oppPro', 'anyPro'];
const isObj = (x: unknown): boolean => !!x && typeof x === 'object' && !Array.isArray(x);

/**
 * Checa os blocos de efeito de um card; devolve os problemas em pt-BR (vazio = válido).
 * Os números fora da faixa também são reaplicados em runtime (compile.ts), mas aqui viram erro.
 */
export function validateEffects(c: EffectsCard): string[] {
  const errors: string[] = [];
  const parts = c.effects ?? [];
  if (!Array.isArray(parts)) return ['Efeitos inválidos.'];
  if (parts.length > MAX_PARTS) errors.push(`No máximo ${MAX_PARTS} efeitos por card.`);
  if (c.kind !== 'pro' && !parts.length)
    errors.push(c.kind === 'task' ? 'Uma Task precisa de pelo menos um efeito.' : 'Um Bug precisa de pelo menos um efeito.');

  const triggers = triggersFor(c.kind, c.speed);
  const passives = passivesFor(c.kind, c.speed);
  let usesChosen = false;
  let ignitions = 0;

  parts.forEach((p, i) => {
    const n = `Efeito ${i + 1}`;
    if (!isObj(p)) return void errors.push(`${n}: inválido.`);
    if (isPassive(p)) {
      if (!passives.includes(p.passive)) return void errors.push(`${n}: este tipo de card não aceita esse efeito contínuo.`);
      if (p.passive === 'equip' && (!inRange(p.atk, RANGES.equip) || !inRange(p.def, RANGES.equip) || !(p.atk || p.def)))
        errors.push(`${n}: o equipamento dá de 0 a ${RANGES.equip.max} de ATK e DEF, de ${RANGES.equip.step} em ${RANGES.equip.step}.`);
      if (p.passive === 'aura') {
        if (!['me', 'opp'].includes(p.side) || !inRange(p.atk, RANGES.aura) || !inRange(p.def, RANGES.aura) || !(p.atk || p.def))
          errors.push(`${n}: a aura vai de ${RANGES.aura.min} a ${RANGES.aura.max}, de ${RANGES.aura.step} em ${RANGES.aura.step}.`);
        else if (p.side === 'me' && (c.kind === 'pro' || p.def !== 0))
          errors.push(`${n}: a aura nos seus Profissionais é só de ATK e só em Task.`);
        else if (Math.sign(p.atk) * Math.sign(p.def) < 0) errors.push(`${n}: a aura sobe ou desce os dois valores juntos.`);
      }
      if (p.passive === 'selfAtk' && !inRange(p.amount, RANGES.selfAtk))
        errors.push(`${n}: o bônus de ATK vai de ${RANGES.selfAtk.min} a ${RANGES.selfAtk.max}.`);
      return;
    }

    if (!triggers.includes(p.when)) return void errors.push(`${n}: este tipo de card não usa esse gatilho.`);
    if (p.when === 'ignition' && ++ignitions > 1) errors.push(`${n}: só um efeito ativável por card.`);
    if (p.when === 'ignition' && (typeof p.label !== 'string' || p.label.trim().length < 2 || p.label.length > 30))
      errors.push(`${n}: dê um nome de 2 a 30 caracteres ao efeito ativável.`);
    const conds = p.if ?? [];
    if (!Array.isArray(conds) || conds.length > MAX_CONDITIONS) errors.push(`${n}: no máximo ${MAX_CONDITIONS} condições.`);
    else conds.forEach((k) => validateCondition(k, n, errors));
    if (!Array.isArray(p.do) || !p.do.length || p.do.length > MAX_ACTIONS) return void errors.push(`${n}: de 1 a ${MAX_ACTIONS} ações.`);
    for (const a of p.do) {
      validateAction(a, n, c, p.when, errors);
      if (isObj(a) && targetOf(a) === 'chosen') usesChosen = true;
    }
  });

  if (usesChosen && (!c.target || !CHOSEN_KINDS.includes(c.target))) errors.push('Escolha que tipo de alvo o jogador escolhe.');
  const equip = c.kind === 'task' && c.speed === 'equip';
  if (equip && c.target !== 'ownPro') errors.push('Equipamento mira 1 Profissional seu.');
  if (equip && !parts.some((p) => isObj(p) && isPassive(p) && p.passive === 'equip'))
    errors.push('Equipamento precisa do efeito "Equipamento".');
  if (!usesChosen && !equip && c.target !== undefined) errors.push('Nenhuma ação usa o alvo escolhido: tire o alvo.');
  return errors;
}

function validateCondition(k: Condition, n: string, errors: string[]) {
  if (!isObj(k)) return void errors.push(`${n}: condição inválida.`);
  const ok =
    (k.if === 'stressAtLeast' && ['me', 'opp'].includes(k.side) && inRange(k.n, RANGES.stressAtLeast)) ||
    (k.if === 'lpAtMost' && ['me', 'opp'].includes(k.side) && inRange(k.n, RANGES.lpAtMost)) ||
    (k.if === 'controlsAttr' && ATTRS.includes(k.attr)) ||
    k.if === 'oppHasPros' ||
    (k.if === 'chance' && (CHANCES as readonly number[]).includes(k.pct));
  if (!ok) errors.push(`${n}: condição inválida.`);
}

function validateAction(a: EffectAction, n: string, c: EffectsCard, when: string, errors: string[]) {
  if (!isObj(a)) return void errors.push(`${n}: ação inválida.`);
  const t = targetOf(a);
  if (t !== undefined) {
    if (!TARGETS.includes(t)) return void errors.push(`${n}: alvo inválido.`);
    if (t === 'chosen' && when !== 'activate' && when !== 'ignition')
      errors.push(`${n}: só Task ou efeito ativável miram o alvo escolhido.`);
    if (t === 'self' && c.kind !== 'pro') errors.push(`${n}: "este card" só vale para Profissional.`);
    if (t === 'event' && !(c.kind === 'bug' && c.trigger && EVENT_TARGET[c.trigger]))
      errors.push(`${n}: este gatilho não tem Profissional no evento.`);
  }
  const range = (ok: boolean, what: string) => ok || errors.push(`${n}: ${what}.`);
  switch (a.do) {
    case 'damage':
    case 'selfDamage':
    case 'heal':
      return void range(
        inRange(a.amount, RANGES.damage),
        `o valor vai de ${RANGES.damage.min} a ${RANGES.damage.max}, de ${RANGES.damage.step} em ${RANGES.damage.step}`,
      );
    case 'stress':
      return void range(
        ['me', 'opp', 'both'].includes(a.side) && inRange(a.amount, RANGES.stress) && a.amount !== 0,
        'o Estresse vai de −3 a +3 (sem 0)',
      );
    case 'draw':
      return void range(inRange(a.amount, RANGES.draw), 'compra 1 ou 2 cards');
    case 'search':
      return void range(KINDS.includes(a.kind), 'tipo de card inválido');
    case 'tempAtk':
      return void range(
        inRange(a.amount, RANGES.tempAtk) && a.amount !== 0,
        `o ATK vai de ${RANGES.tempAtk.min} a +${RANGES.tempAtk.max} (sem 0)`,
      );
    case 'modStats':
      return void range(
        inRange(a.atk, RANGES.modStats) && inRange(a.def, RANGES.modStats) && !!(a.atk || a.def),
        `ATK e DEF vão de ${RANGES.modStats.min} a +${RANGES.modStats.max}`,
      );
    case 'destroy':
    case 'bounce':
    case 'position':
    case 'negate':
    case 'destroySet':
    case 'revealSets':
      return;
    case 'negateEvent':
      return void range(c.kind === 'bug' && !!c.trigger && !!NEGATABLE[c.trigger], 'só Bug de ataque, Task, Bug ou dano anula o evento');
    default:
      errors.push(`${n}: ação desconhecida.`);
  }
}
