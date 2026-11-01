import type { BugTrigger, CardKind, TargetKind } from '../core/types';
import { EVENT_TARGET, NEGATABLE } from './rules';
import {
  isPassive,
  type EffectAction,
  type Condition,
  type EffectBlock,
  type EffectPart,
  type Passive,
  type TargetRef,
  type Trigger,
} from './types';

/** O que o texto precisa saber do card. */
export interface DescribeCard {
  kind: CardKind;
  trigger?: BugTrigger;
  target?: TargetKind;
  effects?: readonly EffectPart[];
}

const ATTR_NAME: Record<string, string> = { TREVA: 'TREVA', AGUA: 'ÁGUA', TERRA: 'TERRA', FOGO: 'FOGO', LUZ: 'LUZ', TECH: 'TECH' };

export const TRIGGER_TEXT: Record<Exclude<Trigger, 'bug'>, string> = {
  summon: 'Ao ser invocado',
  flip: 'FLIP',
  standby: 'No início do seu turno',
  battleKill: 'Quando destrói um Profissional em batalha',
  destroyed: 'Quando é destruído',
  ignition: 'Uma vez por turno',
  activate: '',
  endTurn: 'No fim de cada turno',
};

export const BUG_TRIGGER_TEXT: Record<BugTrigger, string> = {
  oppSummon: 'Quando o oponente invoca um Profissional',
  oppAttack: 'Quando o oponente declara um ataque',
  oppDirectAttack: 'Quando o oponente declara um ataque direto',
  oppTask: 'Quando o oponente ativa uma Task',
  battleDamage: 'Quando você vai receber dano de batalha',
  proDestroyedByBattle: 'Quando um Profissional seu é destruído em batalha',
  oppBug: 'Quando um Bug do oponente vai disparar',
};

const CHOSEN: Record<TargetKind, string> = {
  ownPro: '1 Profissional seu',
  oppPro: '1 Profissional do oponente',
  anyPro: '1 Profissional',
  oppSet: '1 card virado do oponente',
};

function targetText(t: TargetRef, c: DescribeCard): string {
  switch (t) {
    case 'chosen':
      return `o alvo (${CHOSEN[c.target ?? 'anyPro']})`;
    case 'self':
      return 'este card';
    case 'event':
      return (c.trigger && EVENT_TARGET[c.trigger]) ?? 'o Profissional do evento';
    case 'strongestOpp':
      return 'o Profissional mais forte do oponente';
    case 'weakestOpp':
      return 'o Profissional mais fraco do oponente';
    case 'randomOpp':
      return 'um Profissional aleatório do oponente';
    case 'strongestMine':
      return 'seu Profissional mais forte';
    case 'weakestMine':
      return 'seu Profissional mais fraco';
  }
}

const signed = (n: number) => (n > 0 ? `+${n}` : `−${-n}`);
const KIND_NAME: Record<CardKind, string> = { pro: 'Profissional', task: 'Task', bug: 'Bug' };

export function describeAction(a: EffectAction, c: DescribeCard): string {
  switch (a.do) {
    case 'damage':
      return `causa ${a.amount} de dano ao oponente`;
    case 'selfDamage':
      return `você perde ${a.amount} LP`;
    case 'heal':
      return `você recupera ${a.amount} LP`;
    case 'stress': {
      const n = Math.abs(a.amount);
      if (a.side === 'me') return a.amount < 0 ? `seu Estresse −${n}` : `você ganha +${n} de Estresse`;
      if (a.side === 'opp') return a.amount > 0 ? `o oponente ganha +${n} de Estresse` : `o Estresse do oponente −${n}`;
      return a.amount > 0 ? `os dois jogadores ganham +${n} de Estresse` : `o Estresse dos dois jogadores −${n}`;
    }
    case 'draw':
      return a.amount === 1 ? 'você compra 1 card' : `você compra ${a.amount} cards`;
    case 'search':
      return `você adiciona 1 ${KIND_NAME[a.kind]} do deck à mão`;
    case 'tempAtk':
      return `${targetText(a.target, c)} ${a.amount > 0 ? 'ganha' : 'perde'} ${Math.abs(a.amount)} ATK até o fim do turno`;
    case 'modStats': {
      const parts = [a.atk && `${signed(a.atk)} ATK`, a.def && `${signed(a.def)} DEF`].filter(Boolean).join(' e ');
      return `${targetText(a.target, c)} fica com ${parts}`;
    }
    case 'destroy':
      return `destrói ${targetText(a.target, c)}`;
    case 'bounce':
      return `devolve ${targetText(a.target, c)} para a mão`;
    case 'position':
      return `troca a posição de ${targetText(a.target, c)}`;
    case 'negate':
      return `anula os efeitos de ${targetText(a.target, c)} até o fim do próximo turno`;
    case 'destroySet':
      return 'destrói 1 Task/Bug virado aleatório do oponente';
    case 'negateEvent':
      return (c.trigger && NEGATABLE[c.trigger]) ?? 'anula o evento';
    case 'revealSets':
      return 'revela os cards virados do oponente';
  }
}

export function describeCondition(k: Condition): string {
  switch (k.if) {
    case 'stressAtLeast':
      return k.side === 'me' ? `se o seu Estresse for ${k.n} ou mais` : `se o Estresse do oponente for ${k.n} ou mais`;
    case 'lpAtMost':
      return k.side === 'me' ? `se você tiver ${k.n} LP ou menos` : `se o oponente tiver ${k.n} LP ou menos`;
    case 'controlsAttr':
      return `se você controlar um Profissional ${ATTR_NAME[k.attr] ?? k.attr}`;
    case 'oppHasPros':
      return 'se o oponente tiver Profissionais no campo';
    case 'chance':
      return `com ${k.pct}% de chance`;
  }
}

/** "a, b e c". */
const joinAnd = (xs: string[]) => (xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} e ${xs.at(-1)}`);
const capitalize = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

export function describeBlock(b: EffectBlock, c: DescribeCard): string {
  const actions = joinAnd(b.do.map((a) => describeAction(a, c)));
  const conds = (b.if ?? []).map(describeCondition);
  const head = b.when === 'bug' ? (c.trigger ? BUG_TRIGGER_TEXT[c.trigger] : 'Quando dispara') : TRIGGER_TEXT[b.when];
  const label = b.when === 'ignition' && b.label?.trim() ? ` (${b.label.trim()})` : '';
  // Task: sem gatilho no texto ("Seu Estresse −2 e você recupera 1000 LP.").
  if (!head) return conds.length ? `${capitalize(conds.join(', '))}: ${actions}.` : `${capitalize(actions)}.`;
  return `${head}${label}${conds.length ? `, ${conds.join(', ')}` : ''}: ${actions}.`;
}

export function describePassive(p: Passive): string {
  switch (p.passive) {
    case 'equip': {
      const parts = [p.atk && `+${p.atk} ATK`, p.def && `+${p.def} DEF`].filter(Boolean).join(' e ');
      return `Equipamento: o Profissional equipado ganha ${parts}.`;
    }
    case 'aura': {
      const parts = [p.atk && `${Math.abs(p.atk)} ATK`, p.def && `${Math.abs(p.def)} DEF`].filter(Boolean).join(' e ');
      const verb = (p.atk || p.def) > 0 ? 'ganham' : 'perdem';
      return p.side === 'me' ? `Seus Profissionais ${verb} ${parts}.` : `Os Profissionais do oponente ${verb} ${parts}.`;
    }
    case 'selfAtk':
      return `Ganha +${p.amount} ATK.`;
    case 'battleSave':
      return 'Uma vez por turno, não é destruído em batalha.';
    case 'shield':
      return 'Você não recebe dano de batalha das batalhas dele.';
    case 'guard':
      return 'Uma vez por turno, anula um ataque contra ele.';
  }
}

/** Texto do card gerado a partir dos blocos (a mesma frase vai para o log quando o bloco dispara). */
export function describeEffects(c: DescribeCard): string {
  return (c.effects ?? []).map((p) => (isPassive(p) ? describePassive(p) : describeBlock(p, c))).join(' ');
}
