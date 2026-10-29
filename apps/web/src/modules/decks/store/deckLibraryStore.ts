import { STARTER_DECKS, type DeckList } from '@devoh/engine';
import { create } from 'zustand';
import { useProfile } from '../../profile';
import { loadCustomDecks, saveCustomDecks } from '../services/deckRepository';

interface DeckLibraryState {
  custom: DeckList[];
  /** Salva (cria ou substitui) um deck personalizado. */
  save(deck: DeckList): void;
  remove(id: string): void;
}

export const useDeckLibrary = create<DeckLibraryState>((set, get) => ({
  custom: loadCustomDecks(),
  save(deck) {
    const custom = [...get().custom.filter((d) => d.id !== deck.id), deck];
    saveCustomDecks(custom);
    set({ custom });
  },
  remove(id) {
    const custom = get().custom.filter((d) => d.id !== id);
    saveCustomDecks(custom);
    set({ custom });
  },
}));

/** Decks iniciais + personalizados. */
export function useAllDecks(): DeckList[] {
  const custom = useDeckLibrary((s) => s.custom);
  return [...STARTER_DECKS, ...custom];
}

/** Deck salvo no perfil (ou o primeiro inicial, se ele não existir mais). */
export function useSelectedDeck(): DeckList {
  const deckId = useProfile((s) => s.deckId);
  return useAllDecks().find((d) => d.id === deckId) ?? STARTER_DECKS[0];
}
