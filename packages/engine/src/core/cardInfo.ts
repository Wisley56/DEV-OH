import type { CardEffects } from '../effects/types';
import { card, cardList, codeOf, effectsOf } from './catalog';
import type { CardDef, Rarity } from './types';

/** Moldura do card: Profissional Normal (sem efeito), de Efeito, Task ou Bug. */
export type CardFrame = 'normal' | 'effect' | 'task' | 'bug';

/**
 * As funções abaixo leem os efeitos do catálogo; `fx` permite passar os efeitos de um card que
 * ainda não está instalado (o rascunho do criador de cartas).
 */
export function cardFrame(d: CardDef, fx: CardEffects | undefined = effectsOf(d.id)): CardFrame {
  if (d.kind !== 'pro') return d.kind;
  return fx || d.ignition ? 'effect' : 'normal';
}

/** Profissional com efeito FLIP. */
export const isFlip = (d: CardDef, fx: CardEffects | undefined = effectsOf(d.id)) => d.kind === 'pro' && !!fx?.onFlip;

const TASK_LABEL = {
  normal: 'Task',
  continuous: 'Task Contínua',
  field: 'Task de Campo',
  quick: 'Task Rápida',
  equip: 'Task de Equipamento',
};
const BUG_LABEL = { normal: 'Bug', continuous: 'Bug Contínuo', counter: 'Contra-Bug' };

/** Subtipo legível: "Task Rápida", "Contra-Bug", "Efeito"… */
export function subtypeLabel(d: CardDef, fx: CardEffects | undefined = effectsOf(d.id)): string {
  if (d.kind === 'task') return TASK_LABEL[d.speed ?? 'normal'];
  if (d.kind === 'bug') return BUG_LABEL[d.bugType ?? 'normal'];
  return cardFrame(d, fx) === 'normal' ? 'Normal' : 'Efeito';
}

/** Linha de tipo completa: "Humano / Tech Lead / Efeito / FLIP", "Task Rápida / Alto Risco". */
export function fullTypeLine(d: CardDef, fx: CardEffects | undefined = effectsOf(d.id)): string {
  const parts = d.kind === 'pro' ? [d.typeLine, subtypeLabel(d, fx), isFlip(d, fx) ? 'FLIP' : ''] : [subtypeLabel(d, fx), d.typeLine];
  return parts.filter(Boolean).join(' / ');
}

export const RARITIES: readonly Rarity[] = ['comum', 'rara', 'super', 'ultra', 'secreta'];

export const RARITY_INFO: Record<Rarity, { label: string; short: string }> = {
  comum: { label: 'Comum', short: 'C' },
  rara: { label: 'Rara', short: 'R' },
  super: { label: 'Super Rara', short: 'SR' },
  ultra: { label: 'Ultra Rara', short: 'UR' },
  secreta: { label: 'Secreta', short: 'SE' },
};

/** Código de coleção: o fixo do card (DVOH-X01, criados no painel) ou pela ordem do catálogo (DVOH-001). */
export function setCode(id: string): string {
  const fixed = codeOf(id);
  if (fixed) return fixed;
  const i = cardList().findIndex((c) => c.id === id);
  return `DVOH-${String(i + 1).padStart(3, '0')}`;
}

/** Informações derivadas de um card, num objeto só (para a interface). */
export function cardInfo(id: string) {
  const d = card(id);
  return { frame: cardFrame(d), flip: isFlip(d), subtype: subtypeLabel(d), typeLine: fullTypeLine(d), code: setCode(id) };
}
