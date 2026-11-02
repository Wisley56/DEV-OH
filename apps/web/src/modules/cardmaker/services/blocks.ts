import {
  BUG_TRIGGER_TEXT,
  EVENT_TARGET,
  isPassive,
  NEGATABLE,
  passivesFor,
  RANGES,
  triggersFor,
  type Condition,
  type CustomCardInput,
  type EffectAction,
  type EffectBlock,
  type EffectPart,
  type Passive,
  type Range,
  type TargetRef,
  type Trigger,
} from '@devoh/engine';

/** O que o montador de blocos oferece em cada situação, com rótulos e valores iniciais. */

export type ActionKind = EffectAction['do'];
export type PassiveKind = Passive['passive'];
export type ConditionKind = Condition['if'];

export const TRIGGER_LABEL: Record<Trigger, string> = {
  summon: 'Ao ser invocado',
  flip: 'FLIP (ao ser virado)',
  standby: 'No início do seu turno',
  battleKill: 'Ao destruir em batalha',
  destroyed: 'Ao ser destruído',
  ignition: 'Ativável (1x por turno)',
  activate: 'Ao ativar',
  endTurn: 'No fim de cada turno',
  bug: 'Quando o Bug dispara',
};

export const ACTION_LABEL: Record<ActionKind, string> = {
  damage: 'Dano no oponente',
  selfDamage: 'Dano em você',
  heal: 'Recuperar LP',
  stress: 'Estresse',
  draw: 'Comprar cards',
  search: 'Buscar no deck',
  tempAtk: 'ATK até o fim do turno',
  modStats: 'ATK/DEF permanente',
  destroy: 'Destruir',
  bounce: 'Voltar para a mão',
  position: 'Trocar posição',
  negate: 'Anular efeitos',
  destroySet: 'Destruir 1 Task/Bug virado',
  negateEvent: 'Anular o evento',
  revealSets: 'Revelar os virados',
};

export const PASSIVE_LABEL: Record<PassiveKind, string> = {
  equip: 'Equipamento (+ATK/DEF)',
  aura: 'Aura no campo',
  selfAtk: 'ATK extra em si',
  battleSave: 'Não é destruído em batalha (1x/turno)',
  shield: 'Sem dano de batalha',
  guard: 'Anula 1 ataque contra ele (1x/turno)',
};

export const TARGET_LABEL: Record<TargetRef, string> = {
  chosen: 'o alvo escolhido',
  self: 'ele mesmo',
  event: 'o do evento',
  strongestOpp: 'o mais forte do oponente',
  weakestOpp: 'o mais fraco do oponente',
  randomOpp: 'um aleatório do oponente',
  strongestMine: 'o seu mais forte',
  weakestMine: 'o seu mais fraco',
};

export const CONDITION_LABEL: Record<ConditionKind, string> = {
  stressAtLeast: 'Só se o Estresse for pelo menos',
  lpAtMost: 'Só se os LP forem no máximo',
  controlsAttr: 'Só se você controla um Profissional',
  oppHasPros: 'Só se o oponente tem Profissional',
  chance: 'Com chance de',
};

const TARGETED = new Set<ActionKind>(['tempAtk', 'modStats', 'destroy', 'bounce', 'position', 'negate']);
export const isTargeted = (a: ActionKind) => TARGETED.has(a);

/** Números de cada ação/passivo: faixa do engine (a mesma que a validação usa). */
export const RANGE_OF: Partial<Record<ActionKind | PassiveKind | ConditionKind, Range>> = {
  damage: RANGES.damage,
  selfDamage: RANGES.damage,
  heal: RANGES.heal,
  stress: RANGES.stress,
  draw: RANGES.draw,
  tempAtk: RANGES.tempAtk,
  modStats: RANGES.modStats,
  equip: RANGES.equip,
  aura: RANGES.aura,
  selfAtk: RANGES.selfAtk,
  stressAtLeast: RANGES.stressAtLeast,
  lpAtMost: RANGES.lpAtMost,
};

/** Gatilhos que este card aceita (os passivos aparecem como "Sempre ativo"). */
export const triggerOptions = (input: CustomCardInput): Trigger[] => triggersFor(input.kind, input.speed);
export const passiveOptions = (input: CustomCardInput): PassiveKind[] => passivesFor(input.kind, input.speed);

/** Ações que fazem sentido neste card ("anular o evento" só no Bug cujo evento dá para anular). */
export function actionOptions(input: CustomCardInput): ActionKind[] {
  return (Object.keys(ACTION_LABEL) as ActionKind[]).filter(
    (a) => a !== 'negateEvent' || (input.kind === 'bug' && !!input.trigger && !!NEGATABLE[input.trigger]),
  );
}

/** Alvos possíveis de uma ação com alvo, conforme o gatilho e o tipo de card. */
export function targetOptions(input: CustomCardInput, when: Trigger): TargetRef[] {
  const out: TargetRef[] = [];
  if (when === 'activate' || when === 'ignition') out.push('chosen');
  if (input.kind === 'pro') out.push('self');
  if (when === 'bug' && input.trigger && EVENT_TARGET[input.trigger]) out.push('event');
  out.push('strongestOpp', 'weakestOpp', 'randomOpp', 'strongestMine', 'weakestMine');
  return out;
}

export function defaultAction(kind: ActionKind, input: CustomCardInput, when: Trigger): EffectAction {
  const target = targetOptions(input, when).find((t) => t !== 'chosen' || !!input.target) ?? 'strongestOpp';
  switch (kind) {
    case 'damage':
    case 'selfDamage':
    case 'heal':
      return { do: kind, amount: 500 };
    case 'stress':
      return { do: 'stress', side: 'opp', amount: 1 };
    case 'draw':
      return { do: 'draw', amount: 1 };
    case 'search':
      return { do: 'search', kind: 'task' };
    case 'tempAtk':
      return { do: 'tempAtk', target: input.kind === 'pro' ? 'self' : target, amount: 500 };
    case 'modStats':
      return { do: 'modStats', target: input.kind === 'pro' ? 'self' : target, atk: 300, def: 0 };
    case 'destroy':
    case 'bounce':
    case 'position':
    case 'negate':
      return { do: kind, target: target === 'self' ? 'strongestOpp' : target };
    default:
      return { do: kind };
  }
}

export function defaultPassive(kind: PassiveKind): Passive {
  switch (kind) {
    case 'equip':
      return { passive: 'equip', atk: 500, def: 0 };
    case 'aura':
      return { passive: 'aura', side: 'me', atk: 200, def: 0 };
    case 'selfAtk':
      return { passive: 'selfAtk', amount: 300 };
    default:
      return { passive: kind };
  }
}

export function defaultCondition(kind: ConditionKind): Condition {
  switch (kind) {
    case 'stressAtLeast':
      return { if: kind, side: 'me', n: 3 };
    case 'lpAtMost':
      return { if: kind, side: 'me', n: 2000 };
    case 'controlsAttr':
      return { if: kind, attr: 'TECH' };
    case 'chance':
      return { if: kind, pct: 50 };
    default:
      return { if: kind };
  }
}

/** Bloco novo: primeiro gatilho livre deste card, com uma ação simples. */
export function newBlock(input: CustomCardInput): EffectBlock {
  const used = new Set((input.effects ?? []).filter((p): p is EffectBlock => !isPassive(p)).map((b) => b.when));
  const options = triggerOptions(input);
  const when = options.find((t) => !used.has(t) && t !== 'ignition') ?? options[0]!;
  return { when, do: [defaultAction(input.kind === 'bug' ? 'negateEvent' : 'heal', input, when)] };
}

/** Texto do gatilho do Bug, para mostrar no bloco. */
export const bugTriggerText = (input: CustomCardInput) => (input.trigger ? BUG_TRIGGER_TEXT[input.trigger] : 'Quando dispara');

export interface Recipe {
  label: string;
  kinds: CustomCardInput['kind'][];
  /** Mudanças no card além do bloco (ex.: virar Equipamento). */
  patch?: Partial<CustomCardInput>;
  part: EffectPart;
}

/** Atalhos prontos: um clique adiciona o bloco (e ajusta o card, se preciso). */
export const RECIPES: Recipe[] = [
  { label: 'Ao ser invocado: recupere 800 LP', kinds: ['pro'], part: { when: 'summon', do: [{ do: 'heal', amount: 800 }] } },
  { label: 'FLIP: compre 1 card', kinds: ['pro'], part: { when: 'flip', do: [{ do: 'draw', amount: 1 }] } },
  {
    label: 'Ativável: +500 ATK nele',
    kinds: ['pro'],
    part: { when: 'ignition', label: 'Foco total', do: [{ do: 'tempAtk', target: 'self', amount: 500 }] },
  },
  { label: 'Não é destruído em batalha', kinds: ['pro'], part: { passive: 'battleSave' } },
  {
    label: 'Estresse +2 no oponente',
    kinds: ['task'],
    part: { when: 'activate', do: [{ do: 'stress', side: 'opp', amount: 2 }] },
  },
  {
    label: 'Destruir o mais forte do oponente',
    kinds: ['task'],
    part: { when: 'activate', do: [{ do: 'destroy', target: 'strongestOpp' }] },
  },
  {
    label: 'Equipamento: +500 ATK',
    kinds: ['task'],
    patch: { speed: 'equip', target: 'ownPro' },
    part: { passive: 'equip', atk: 500, def: 0 },
  },
  {
    label: 'Anula o ataque',
    kinds: ['bug'],
    patch: { trigger: 'oppAttack', bugType: 'normal' },
    part: { when: 'bug', do: [{ do: 'negateEvent' }] },
  },
  {
    label: 'Dano de 600 em quem ataca',
    kinds: ['bug'],
    patch: { trigger: 'oppAttack' },
    part: { when: 'bug', do: [{ do: 'damage', amount: 600 }] },
  },
];
