import type { Attribute, BugTrigger, BugType, CardKind, Rarity, TaskSpeed } from '../core/types';
import type { CustomCardInput } from './types';

const KINDS: readonly CardKind[] = ['pro', 'task', 'bug'];
const RARITIES: readonly Rarity[] = ['comum', 'rara', 'super', 'ultra', 'secreta'];
const ATTRIBUTES: readonly Attribute[] = ['TREVA', 'AGUA', 'TERRA', 'FOGO', 'LUZ', 'TECH'];
const SPEEDS: readonly TaskSpeed[] = ['normal', 'continuous', 'field', 'quick', 'equip'];
const BUG_TYPES: readonly BugType[] = ['normal', 'continuous', 'counter'];
const TRIGGERS: readonly BugTrigger[] = [
  'oppSummon',
  'oppAttack',
  'oppDirectAttack',
  'oppTask',
  'battleDamage',
  'proDestroyedByBattle',
  'oppBug',
];

const ID = /^x_[a-z0-9_]{2,36}$/;
const TAG = /^[a-z0-9_-]{1,20}$/;
/** Normal/Efeito/FLIP são derivados da carta; o admin escreve só a raça / função. */
const DERIVED_WORDS = /\b(normal|efeito|flip)\b/i;

const MAX_STAT = 3000;
const STAT_STEP = 50;

const isStat = (n: unknown) => Number.isInteger(n) && (n as number) >= 0 && (n as number) <= MAX_STAT && (n as number) % STAT_STEP === 0;
const isText = (s: unknown, max: number) => s === undefined || (typeof s === 'string' && s.length <= max);

/**
 * Checagem estrutural de um card do painel; devolve os problemas em pt-BR (vazio = válido).
 * Roda no servidor antes de gravar, na instalação do catálogo e na interface.
 */
export function validateCustomInput(input: CustomCardInput): string[] {
  if (!input || typeof input !== 'object') return ['Card inválido.'];
  const errors: string[] = [];
  const { kind } = input;

  if (typeof input.id !== 'string' || !ID.test(input.id))
    errors.push('O id precisa começar com "x_" e ter só letras minúsculas, números e "_" (4 a 38 caracteres).');
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  if (name.length < 2 || name.length > 40) errors.push('O nome precisa ter de 2 a 40 caracteres.');
  if (!KINDS.includes(kind)) errors.push('Tipo de card inválido.');
  if (!RARITIES.includes(input.rarity)) errors.push('Raridade inválida.');
  if (!isText(input.typeLine, 40)) errors.push('A linha de tipo pode ter até 40 caracteres.');
  if (!isText(input.lore, 300)) errors.push('A descrição pode ter até 300 caracteres.');
  if (!isText(input.flavor, 200)) errors.push('A história pode ter até 200 caracteres.');
  if (
    input.tags !== undefined &&
    (!Array.isArray(input.tags) || input.tags.length > 5 || !input.tags.every((t) => typeof t === 'string' && TAG.test(t)))
  )
    errors.push('Tags: até 5, só letras minúsculas, números, "-" e "_".');

  if (kind === 'pro') {
    if (!Number.isInteger(input.level) || (input.level as number) < 1 || (input.level as number) > 10)
      errors.push('O nível vai de 1 a 10.');
    if (!isStat(input.atk) || !isStat(input.def)) errors.push(`ATK e DEF vão de 0 a ${MAX_STAT}, de ${STAT_STEP} em ${STAT_STEP}.`);
    if (!input.attribute || !ATTRIBUTES.includes(input.attribute)) errors.push('Escolha o atributo do Profissional.');
    if (typeof input.typeLine !== 'string' || !input.typeLine.trim())
      errors.push('Escreva a raça / função do Profissional (ex.: "Humano / Tech Lead").');
    else if (DERIVED_WORDS.test(input.typeLine))
      errors.push('Não escreva Normal, Efeito ou FLIP na linha de tipo: o jogo completa sozinho.');
    if (input.trigger !== undefined) errors.push('Profissional não tem gatilho de Bug.');
  } else if (input.level !== undefined || input.atk !== undefined || input.def !== undefined || input.attribute !== undefined) {
    errors.push('Só Profissional tem nível, ATK, DEF e atributo.');
  }

  if (input.speed !== undefined && (kind !== 'task' || !SPEEDS.includes(input.speed))) errors.push('Velocidade só vale para Task.');
  if (input.bugType !== undefined && (kind !== 'bug' || !BUG_TYPES.includes(input.bugType))) errors.push('O tipo de Bug só vale para Bug.');
  if (kind === 'bug' && (!input.trigger || !TRIGGERS.includes(input.trigger))) errors.push('Escolha quando o Bug dispara.');
  if (kind === 'task' && input.trigger !== undefined && (input.speed === 'field' || !TRIGGERS.includes(input.trigger)))
    errors.push('Esta Task não pode ter gatilho.');

  return errors;
}
