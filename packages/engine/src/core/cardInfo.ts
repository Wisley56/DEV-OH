import { card, cardList, effectsOf } from './catalog';
import type { CardDef, Rarity } from './types';

/** Moldura do card: Profissional Normal (sem efeito), de Efeito, Task ou Bug. */
export type CardFrame = 'normal' | 'effect' | 'task' | 'bug';

export function cardFrame(d: CardDef): CardFrame {
  if (d.kind !== 'pro') return d.kind;
  return effectsOf(d.id) || d.ignition ? 'effect' : 'normal';
}

/** Profissional com efeito FLIP. */
export const isFlip = (d: CardDef) => d.kind === 'pro' && !!effectsOf(d.id)?.onFlip;

const TASK_LABEL = {
  normal: 'Task',
  continuous: 'Task Contínua',
  field: 'Task de Campo',
  quick: 'Task Rápida',
  equip: 'Task de Equipamento',
};
const BUG_LABEL = { normal: 'Bug', continuous: 'Bug Contínuo', counter: 'Contra-Bug' };

/** Subtipo legível: "Task Rápida", "Contra-Bug", "Efeito"… */
export function subtypeLabel(d: CardDef): string {
  if (d.kind === 'task') return TASK_LABEL[d.speed ?? 'normal'];
  if (d.kind === 'bug') return BUG_LABEL[d.bugType ?? 'normal'];
  return cardFrame(d) === 'normal' ? 'Normal' : 'Efeito';
}

/** Linha de tipo completa: "Humano / Tech Lead / Efeito / FLIP", "Task Rápida / Alto Risco". */
export function fullTypeLine(d: CardDef): string {
  const parts = d.kind === 'pro' ? [d.typeLine, subtypeLabel(d), isFlip(d) ? 'FLIP' : ''] : [subtypeLabel(d), d.typeLine];
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

/** Código de coleção pela ordem do catálogo: DVOH-001. */
export function setCode(id: string): string {
  const i = cardList().findIndex((c) => c.id === id);
  return `DVOH-${String(i + 1).padStart(3, '0')}`;
}

/** Informações derivadas de um card, num objeto só (para a interface). */
export function cardInfo(id: string) {
  const d = card(id);
  return { frame: cardFrame(d), flip: isFlip(d), subtype: subtypeLabel(d), typeLine: fullTypeLine(d), code: setCode(id) };
}
