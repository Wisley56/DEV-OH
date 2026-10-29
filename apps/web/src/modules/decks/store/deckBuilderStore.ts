import { STARTER_DECKS, type DeckList } from '@devoh/engine';
import { createContext, useContext } from 'react';
import { createStore, useStore, type StoreApi } from 'zustand';
import { useProfile } from '../../profile';
import { addCard, isStarterDeck, newDeckFrom, removeCard } from '../services/deckEditing';
import { useDeckLibrary } from './deckLibraryStore';

export interface DeckBuilderState {
  editing: DeckList;
  /** Card em destaque no painel de pré-visualização. */
  preview: string | null;
  saved: boolean;
  open(deck: DeckList): void;
  addCard(cardId: string): void;
  removeCard(cardId: string): void;
  rename(name: string): void;
  setPreview(cardId: string): void;
  /** Salva e seleciona o deck; deck inicial vira uma cópia personalizada. */
  save(): void;
  /** Exclui o deck personalizado em edição. */
  deleteDeck(): void;
}

/** Um store por tela do deck builder (cada visita começa do zero). */
export function createDeckBuilderStore(): StoreApi<DeckBuilderState> {
  const library = useDeckLibrary.getState;
  return createStore<DeckBuilderState>((set, get) => ({
    editing: newDeckFrom(STARTER_DECKS[0], library().custom.length),
    preview: null,
    saved: false,
    open: (deck) => set({ editing: structuredClone(deck), saved: false }),
    addCard: (cardId) => {
      const editing = addCard(get().editing, cardId);
      if (editing !== get().editing) set({ editing, saved: false });
    },
    removeCard: (cardId) => {
      const editing = removeCard(get().editing, cardId);
      if (editing !== get().editing) set({ editing, saved: false });
    },
    rename: (name) => set({ editing: { ...get().editing, name }, saved: false }),
    setPreview: (preview) => set({ preview }),
    save: () => {
      const { editing } = get();
      const deck = isStarterDeck(editing.id) ? newDeckFrom(editing, library().custom.length) : editing;
      library().save(deck);
      useProfile.getState().setDeckId(deck.id);
      set({ editing: deck, saved: true });
    },
    deleteDeck: () => {
      library().remove(get().editing.id);
      set({ editing: newDeckFrom(STARTER_DECKS[0], library().custom.length) });
    },
  }));
}

export const DeckBuilderContext = createContext<StoreApi<DeckBuilderState> | null>(null);

export function useDeckBuilder<T>(selector: (s: DeckBuilderState) => T): T {
  const store = useContext(DeckBuilderContext);
  if (!store) throw new Error('useDeckBuilder fora do <DeckBuilder>.');
  return useStore(store, selector);
}
