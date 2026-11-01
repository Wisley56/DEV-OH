import type { BugTrigger, TaskSpeed } from '../core/types';
import type { EffectAction, Passive, TargetRef, Trigger } from './types';

/** Limites dos blocos: o criador de cartas usa os mesmos números nos campos. */
export const MAX_PARTS = 3;
export const MAX_ACTIONS = 3;
export const MAX_CONDITIONS = 2;

export interface Range {
  min: number;
  max: number;
  step: number;
}

/** Faixa e passo de cada número dos blocos (também reaplicados em runtime, por segurança). */
export const RANGES = {
  damage: { min: 100, max: 3000, step: 100 },
  heal: { min: 100, max: 3000, step: 100 },
  stress: { min: -3, max: 3, step: 1 },
  draw: { min: 1, max: 2, step: 1 },
  tempAtk: { min: -2000, max: 2000, step: 100 },
  modStats: { min: -1500, max: 1500, step: 100 },
  equip: { min: 0, max: 1500, step: 100 },
  aura: { min: -1000, max: 1000, step: 100 },
  selfAtk: { min: 100, max: 1500, step: 100 },
  stressAtLeast: { min: 1, max: 6, step: 1 },
  lpAtMost: { min: 500, max: 4000, step: 500 },
} satisfies Record<string, Range>;

export const CHANCES = [25, 50, 75] as const;

export const inRange = (n: unknown, r: Range) =>
  typeof n === 'number' && Number.isInteger(n) && n >= r.min && n <= r.max && (n - r.min) % r.step === 0;

/** Força o número para dentro da faixa (dados vindos do banco nunca passam disso em jogo). */
export const clamp = (n: number, r: Range) => Math.min(r.max, Math.max(r.min, Math.round(n / r.step) * r.step));

/** Gatilhos que cada tipo de card aceita. Task Normal/Rápida/Equipamento só tem "ao ativar". */
export function triggersFor(kind: 'pro' | 'task' | 'bug', speed: TaskSpeed = 'normal'): Trigger[] {
  if (kind === 'pro') return ['summon', 'flip', 'standby', 'battleKill', 'destroyed', 'ignition'];
  if (kind === 'bug') return ['bug'];
  return speed === 'continuous' || speed === 'field' ? ['activate', 'standby', 'endTurn'] : ['activate'];
}

/** Passivos que cada tipo de card aceita. */
export function passivesFor(kind: 'pro' | 'task' | 'bug', speed: TaskSpeed = 'normal'): Passive['passive'][] {
  if (kind === 'pro') return ['selfAtk', 'battleSave', 'shield', 'guard', 'aura'];
  if (kind === 'task' && speed === 'equip') return ['equip'];
  if (kind === 'task' && (speed === 'continuous' || speed === 'field')) return ['aura'];
  return [];
}

/** Bugs cujo evento pode ser anulado (e o que "anular" quer dizer no texto). */
export const NEGATABLE: Partial<Record<BugTrigger, string>> = {
  oppAttack: 'anula o ataque',
  oppDirectAttack: 'anula o ataque',
  oppTask: 'anula a Task',
  oppBug: 'anula o Bug',
  battleDamage: 'zera o dano de batalha',
};

/** Bugs cujo evento tem um Profissional para "event" (o atacante, o invocado ou quem destruiu). */
export const EVENT_TARGET: Partial<Record<BugTrigger, string>> = {
  oppAttack: 'o atacante',
  oppDirectAttack: 'o atacante',
  oppSummon: 'o Profissional invocado',
  proDestroyedByBattle: 'quem destruiu o seu Profissional',
};

/** Ações que miram um Profissional. */
export const targetOf = (a: EffectAction): TargetRef | undefined => ('target' in a ? a.target : undefined);
