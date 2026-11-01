import { STARTER_DECKS, type DeckList } from '@devoh/engine';
import { createContext, useContext } from 'react';
import { createStore, useStore, type StoreApi } from 'zustand';
import { useProfile } from '../../profile';
import { addCard, newDeckFrom, randomDeck, removeCard } from '../services/deckEditing';
import { useDeckLibrary } from './deckLibraryStore';

export interface DeckBuilderState {
  editing: DeckList;
  /** Card em destaque no painel de pré-visualização. */
  preview: string | null;
  saved: boolean;
  /** Há alterações (cartas ou nome) desde que o deck foi aberto ou salvo. */
  dirty: boolean;
  /** Salvando/excluindo no servidor. */
  busy: boolean;
  /** Erro do servidor ao salvar/excluir. */
  error: string | null;
  /** Cartas das versões anteriores do deck (a última é a mais recente), para desfazer. */
  history: string[][];
  open(deck: DeckList): void;
  addCard(cardId: string): void;
  removeCard(cardId: string): void;
  rename(name: string): void;
  /** Tira todos os cards do deck (pode desfazer). */
  clear(): void;
  /** Troca as cartas por um deck aleatório válido (pode desfazer). */
  autoFill(): void;
  /** Volta à versão do deck antes da última alteração de cartas. */
  undo(): void;
  setPreview(cardId: string): void;
  /** Salva e seleciona o deck; deck inicial vira uma cópia personalizada. */
  save(): Promise<void>;
  /** Exclui o deck personalizado em edição. */
  deleteDeck(): Promise<void>;
}

/** Quantas alterações dá para desfazer. */
export const HISTORY_LIMIT = 50;

/** Um store por tela do deck builder (cada visita começa do zero). */
export function createDeckBuilderStore(rng: () => number = Math.random): StoreApi<DeckBuilderState> {
  const library = useDeckLibrary.getState;
  return createStore<DeckBuilderState>((set, get) => {
    /** Aplica uma nova versão das cartas guardando a anterior no histórico. */
    const commit = (next: DeckList) => {
      const { editing, history } = get();
      if (next === editing) return;
      set({ editing: next, history: [...history, editing.cards].slice(-HISTORY_LIMIT), saved: false, dirty: true });
    };
    const initial = newDeckFrom(STARTER_DECKS[0], library().custom.length);
    return {
      editing: initial,
      preview: initial.cards[0] ?? null,
      saved: false,
      dirty: false,
      busy: false,
      error: null,
      history: [],
      open: (deck) => set({ editing: structuredClone(deck), history: [], saved: false, dirty: false, error: null }),
      addCard: (cardId) => commit(addCard(get().editing, cardId)),
      removeCard: (cardId) => commit(removeCard(get().editing, cardId)),
      rename: (name) => set({ editing: { ...get().editing, name }, saved: false, dirty: true }),
      clear: () => {
        if (get().editing.cards.length) commit({ ...get().editing, cards: [] });
      },
      autoFill: () => commit({ ...get().editing, cards: randomDeck(rng) }),
      undo: () => {
        const { history, editing } = get();
        const prev = history.at(-1);
        // Só as cartas voltam: nome e id (que muda ao salvar um deck inicial) ficam.
        if (prev) set({ editing: { ...editing, cards: prev }, history: history.slice(0, -1), saved: false, dirty: true });
      },
      setPreview: (preview) => set({ preview }),
      save: async () => {
        const { editing } = get();
        // Deck inicial vira cópia; se o jogador já deu outro nome, o nome dele fica.
        const starter = STARTER_DECKS.find((d) => d.id === editing.id);
        const copy = starter && newDeckFrom(editing, library().custom.length);
        const deck = copy ? { ...copy, name: editing.name.trim() && editing.name !== starter.name ? editing.name : copy.name } : editing;
        set({ busy: true, error: null });
        try {
          await library().save(deck);
          useProfile.getState().setDeckId(deck.id);
          set({ editing: deck, saved: true, dirty: false });
        } catch (e) {
          set({ error: (e as Error).message });
        } finally {
          set({ busy: false });
        }
      },
      deleteDeck: async () => {
        set({ busy: true, error: null });
        try {
          await library().remove(get().editing.id);
          set({ editing: newDeckFrom(STARTER_DECKS[0], library().custom.length), history: [], dirty: false });
        } catch (e) {
          set({ error: (e as Error).message });
        } finally {
          set({ busy: false });
        }
      },
    };
  });
}

export const DeckBuilderContext = createContext<StoreApi<DeckBuilderState> | null>(null);

export function useDeckBuilder<T>(selector: (s: DeckBuilderState) => T): T {
  const store = useContext(DeckBuilderContext);
  if (!store) throw new Error('useDeckBuilder fora do <DeckBuilder>.');
  return useStore(store, selector);
}

/** O store em si (para ler o estado na hora, fora da renderização). */
export function useDeckBuilderApi(): StoreApi<DeckBuilderState> {
  const store = useContext(DeckBuilderContext);
  if (!store) throw new Error('useDeckBuilderApi fora do <DeckBuilder>.');
  return store;
}
