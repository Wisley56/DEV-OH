import type { DeckList } from '@devoh/engine';
import { readJson, STORAGE_KEYS, writeJson } from '../../../shared/lib/storage';

/** Decks personalizados guardados neste navegador. */
export const loadCustomDecks = () => readJson<DeckList[]>(STORAGE_KEYS.customDecks, []);
export const saveCustomDecks = (decks: DeckList[]) => writeJson(STORAGE_KEYS.customDecks, decks);
