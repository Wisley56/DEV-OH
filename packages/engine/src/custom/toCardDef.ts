import type { CardDef } from '../core/types';
import { describeEffects } from '../dsl/describe';
import { targetOf } from '../dsl/rules';
import { isPassive, type EffectBlock } from '../dsl/types';
import { customArtUrl, type CustomCardInput } from './types';

/**
 * O CardDef que o jogo usa para um card do painel. O texto é sempre gerado dos blocos
 * (a descrição livre só aparece no Profissional Normal), e a arte vem do servidor.
 */
export function toCardDef(input: CustomCardInput, artVersion: number): CardDef {
  const effects = input.effects ?? [];
  const def: CardDef = {
    id: input.id,
    name: input.name.trim(),
    kind: input.kind,
    rarity: input.rarity,
    text: effects.length ? describeEffects(input) : (input.lore?.trim() ?? ''),
    art: customArtUrl(input.id, artVersion),
  };
  const typeLine = input.typeLine?.trim();
  if (typeLine) def.typeLine = typeLine;
  const flavor = input.flavor?.trim();
  if (flavor) def.flavor = flavor;
  if (input.unique) def.unique = true;
  if (input.tags?.length) def.tags = [...input.tags];
  if (input.kind === 'pro') {
    def.attribute = input.attribute;
    def.level = input.level;
    def.atk = input.atk;
    def.def = input.def;
  }
  if (input.kind === 'task' && input.speed) def.speed = input.speed;
  if (input.kind === 'bug' && input.bugType) def.bugType = input.bugType;
  if (input.trigger) def.trigger = input.trigger;

  const blocks = effects.filter((p): p is EffectBlock => !isPassive(p));
  const ignition = blocks.find((b) => b.when === 'ignition');
  const chosen = (when: string) => blocks.some((b) => b.when === when && b.do.some((a) => targetOf(a) === 'chosen'));
  if (input.kind === 'pro' && ignition) {
    def.ignition = { label: ignition.label?.trim() || 'Efeito', ...(input.target && chosen('ignition') && { target: input.target }) };
  }
  if (input.kind === 'task' && input.target) {
    def.target = input.target;
    // Sem o alvo a Task não faz nada útil: a ativação exige um.
    if (input.speed === 'equip' || chosen('activate')) def.targetRequired = true;
  }
  return def;
}
