/** Leitura/escrita JSON tolerante a falhas (modo privado, storage bloqueado). */

type Store = () => Storage;
const local: Store = () => localStorage;

export function readJson<T>(key: string, fallback: T, store: Store = local): T {
  try {
    const raw = store().getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown, store: Store = local) {
  try {
    store().setItem(key, JSON.stringify(value));
  } catch {
    /* modo privado: segue sem salvar */
  }
}

/** Chaves usadas desde a primeira versão — mantidas para ninguém perder decks e apelido. */
export const STORAGE_KEYS = {
  name: 'devoh.name',
  deck: 'devoh.deck',
  customDecks: 'devoh.customDecks',
  session: 'devoh.session',
  botLevel: 'devoh.botLevel',
} as const;
