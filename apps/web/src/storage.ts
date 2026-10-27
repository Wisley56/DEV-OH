import { STARTER_DECKS, type DeckList } from '@devoh/game';

const K = { name: 'devoh.name', deck: 'devoh.deck', custom: 'devoh.customDecks', session: 'devoh.session' };

function read<T>(key: string, fallback: T, store: () => Storage = () => localStorage): T {
  try {
    const raw = store().getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown, store: () => Storage = () => localStorage) {
  try {
    store().setItem(key, JSON.stringify(value));
  } catch {
    /* modo privado: segue sem salvar */
  }
}

export const getName = () => read<string>(K.name, '');
export const setName = (n: string) => write(K.name, n);

export const getCustomDecks = () => read<DeckList[]>(K.custom, []);
export const saveCustomDecks = (d: DeckList[]) => write(K.custom, d);
export const allDecks = (): DeckList[] => [...STARTER_DECKS, ...getCustomDecks()];

export const getDeckId = () => read<string>(K.deck, STARTER_DECKS[0].id);
export const setDeckId = (id: string) => write(K.deck, id);
export const currentDeck = (): DeckList => allDecks().find((d) => d.id === getDeckId()) ?? STARTER_DECKS[0];

/** Sessão online para reconectar depois de um F5 — por aba (sessionStorage), para duas abas não disputarem o mesmo lugar. */
export interface OnlineSession {
  code: string;
  token: string;
}
export const getSession = () => read<OnlineSession | null>(K.session, null, () => sessionStorage);
export const setSession = (s: OnlineSession | null) => write(K.session, s, () => sessionStorage);
