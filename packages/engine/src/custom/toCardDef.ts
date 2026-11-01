import type { CardDef } from '../core/types';
import { customArtUrl, type CustomCardInput } from './types';

/** O CardDef que o jogo usa para um card do painel. */
export function toCardDef(input: CustomCardInput, artVersion: number): CardDef {
  const def: CardDef = {
    id: input.id,
    name: input.name.trim(),
    kind: input.kind,
    rarity: input.rarity,
    text: input.lore?.trim() ?? '',
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
  return def;
}
