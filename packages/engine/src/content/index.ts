import type { CardCatalog } from '../core/catalog';
import type { CardEffects } from '../effects/api';
import { CARD_MODULES } from './cards';

/** Catálogo do DEV-OH!: implementa a porta CardCatalog do kernel. */
export const DEVOH_CATALOG: CardCatalog = {
  list: CARD_MODULES.map((m) => m.def),
  defs: Object.fromEntries(CARD_MODULES.map((m) => [m.def.id, m.def])),
  effects: Object.fromEntries(CARD_MODULES.filter((m) => m.effects).map((m) => [m.def.id, m.effects as CardEffects])),
};

export { deckById, STARTER_DECKS } from './decks';
