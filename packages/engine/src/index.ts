import { installCatalog } from './core/catalog';
import { DEVOH_CATALOG } from './content';

// Composição: o kernel de regras recebe o catálogo de cards do DEV-OH!.
installCatalog(DEVOH_CATALOG);

export * from './core/types';
export * from './core/constants';
export { card, cardExists, cardList, catalogRevision, nameOf, subscribeCatalog } from './core/catalog';
export { cardFrame, cardInfo, fullTypeLine, isFlip, RARITIES, RARITY_INFO, setCode, subtypeLabel, type CardFrame } from './core/cardInfo';
/** Só os cards em código, fixos. A coleção viva (com os do painel) é `cardList()`. */
export const BASE_CARD_LIST = DEVOH_CATALOG.list;
export { STARTER_DECKS, deckById, HIDDEN_CARD } from './content';
export * from './custom';

export { createGame, type NewGameOptions } from './rules/turn';
export { applyAction } from './rules/actions';
export { forfeit } from './rules/win';
export { validateDeck, maxCopies } from './rules/deck';
export { getView, type GameView, type PlayerView, type ProView, type SpellView, type HandCardView } from './view/getView';

/** Consultas de leitura do tabuleiro (usadas pelos bots e pela interface). */
export { other, prosOf, setCardsOf } from './core/board';
export { getAtk, getDef } from './rules/stats';
