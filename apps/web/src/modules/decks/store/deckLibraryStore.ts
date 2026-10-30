import { STARTER_DECKS, type DeckList } from '@devoh/engine';
import { create } from 'zustand';
import { useAuth } from '../../auth';
import { useProfile } from '../../profile';
import { clearLocalDecks, deckApi, loadLocalDecks } from '../services/deckRepository';

interface DeckLibraryState {
  /** Decks da conta logada (vazio para visitante). */
  custom: DeckList[];
  /** Conta dona da lista carregada. */
  owner: string | null;
  /** Último erro ao salvar/apagar (o estado já voltou ao que estava). */
  error: string | null;
  /** Decks antigos deste navegador esperando a importação. */
  pendingImport: DeckList[];
  /** Salva (cria ou substitui) um deck da conta. */
  save(deck: DeckList): Promise<void>;
  remove(id: string): Promise<void>;
  /** Importa os decks antigos para a conta e apaga do navegador. */
  importLocal(): Promise<number>;
  /** Não importar: apaga os decks antigos do navegador. */
  discardLocal(): void;
}

export const useDeckLibrary = create<DeckLibraryState>((set, get) => ({
  custom: [],
  owner: null,
  error: null,
  pendingImport: [],
  // Otimista: a lista muda na hora e volta como estava se o servidor recusar.
  async save(deck) {
    const before = get().custom;
    set({ custom: [...before.filter((d) => d.id !== deck.id), deck], error: null });
    try {
      await deckApi.save(deck);
    } catch (e) {
      set({ custom: before, error: (e as Error).message });
      throw e;
    }
  },
  async remove(id) {
    const before = get().custom;
    set({ custom: before.filter((d) => d.id !== id), error: null });
    try {
      await deckApi.remove(id);
    } catch (e) {
      set({ custom: before, error: (e as Error).message });
      throw e;
    }
  },
  async importLocal() {
    const { imported } = await deckApi.import(get().pendingImport);
    clearLocalDecks();
    set({ pendingImport: [], custom: await deckApi.list() });
    return imported;
  },
  discardLocal() {
    clearLocalDecks();
    set({ pendingImport: [] });
  },
}));

/** Acompanha a conta: ao entrar, carrega os decks dela (e oferece importar os antigos); ao sair, limpa. */
async function syncWithAccount(username: string | null) {
  if (useDeckLibrary.getState().owner === username) return;
  useDeckLibrary.setState({ custom: [], owner: username, error: null, pendingImport: [] });
  if (!username) return;
  try {
    const custom = await deckApi.list();
    if (useDeckLibrary.getState().owner === username) useDeckLibrary.setState({ custom, pendingImport: loadLocalDecks() });
  } catch (e) {
    useDeckLibrary.setState({ error: (e as Error).message });
  }
}
useAuth.subscribe((s) => void syncWithAccount(s.account?.username ?? null));

/** Decks iniciais + os da conta. */
export function useAllDecks(): DeckList[] {
  const custom = useDeckLibrary((s) => s.custom);
  return [...STARTER_DECKS, ...custom];
}

/** Deck salvo no perfil (ou o primeiro inicial, se ele não existir mais ou for de outra conta). */
export function useSelectedDeck(): DeckList {
  const deckId = useProfile((s) => s.deckId);
  return useAllDecks().find((d) => d.id === deckId) ?? STARTER_DECKS[0];
}
