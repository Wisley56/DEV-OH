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

export function removeKey(key: string, store: Store = local) {
  try {
    store().removeItem(key);
  } catch {
    /* modo privado: nada para apagar */
  }
}

/** Chaves usadas desde a primeira versão — mantidas para ninguém perder preferências (e decks até importá-los). */
export const STORAGE_KEYS = {
  name: 'devoh.name',
  deck: 'devoh.deck',
  customDecks: 'devoh.customDecks',
  /** Sala online desta aba (só o código, que não é segredo: a volta é pela conta). */
  room: 'devoh.room',
  /** Token de assento das versões sem conta: só para apagar. */
  legacySession: 'devoh.session',
  botLevel: 'devoh.botLevel',
  sound: 'devoh.sound',
  tutorialSeen: 'devoh.tutorialSeen',
} as const;
