import type { DeckList } from '@devoh/engine';
import type { DeckPayload } from '@devoh/protocol';
import { api } from '../../../shared/lib/api';
import { readJson, removeKey, STORAGE_KEYS } from '../../../shared/lib/storage';

const payload = (d: DeckList): DeckPayload => ({ id: d.id, name: d.name, description: d.description ?? '', cards: d.cards });

/** Decks da conta logada, guardados no servidor. */
export const deckApi = {
  list: () => api<DeckPayload[]>('/decks'),
  save: (deck: DeckList) => api(`/decks/${encodeURIComponent(deck.id)}`, { method: 'PUT', body: payload(deck) }),
  remove: (id: string) => api(`/decks/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  import: (decks: DeckList[]) => api<{ imported: number }>('/decks/import', { method: 'POST', body: decks.map(payload) }),
};

/** Decks antigos, de quando eles ficavam só neste navegador (importados no 1º login). */
export const loadLocalDecks = () => readJson<DeckList[]>(STORAGE_KEYS.customDecks, []);
export const clearLocalDecks = () => removeKey(STORAGE_KEYS.customDecks);
