import type { CardCatalog } from '../core/catalog';
import type { CardDef } from '../core/types';
import type { CardEffects } from '../effects/api';
import { CARD_MODULES } from './cards';

/**
 * Card interno, fora da coleção: os bots enxergam um Profissional virado do oponente como ele
 * (identidade desconhecida, sem efeitos, DEF médio).
 */
export const HIDDEN_CARD: CardDef = {
  id: '__oculto',
  name: 'Profissional virado',
  kind: 'pro',
  rarity: 'comum',
  typeLine: 'Desconhecido',
  attribute: 'TREVA',
  level: 4,
  atk: 1000,
  def: 1500,
  art: 'icon:❔|#222|#555',
  text: 'Card virado: ninguém sabe quem é.',
};

/** Catálogo do DEV-OH!: implementa a porta CardCatalog do kernel. */
export const DEVOH_CATALOG: CardCatalog = {
  list: CARD_MODULES.map((m) => m.def),
  defs: Object.fromEntries([...CARD_MODULES.map((m) => m.def), HIDDEN_CARD].map((d) => [d.id, d])),
  effects: Object.fromEntries(CARD_MODULES.filter((m) => m.effects).map((m) => [m.def.id, m.effects as CardEffects])),
};

export { deckById, STARTER_DECKS } from './decks';
