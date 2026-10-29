import type { RoomSession } from '@devoh/protocol';
import { readJson, STORAGE_KEYS, writeJson } from '../../../shared/lib/storage';

/** Sessão online para reconectar depois de um F5 — por aba (sessionStorage), para duas abas não disputarem o mesmo lugar. */
const tab = () => sessionStorage;

/** Código de rota que cria uma sala nova (/sala/nova). */
export const NEW_ROOM = 'nova';

export const getSession = () => readJson<RoomSession | null>(STORAGE_KEYS.session, null, tab);
export const setSession = (s: RoomSession | null) => writeJson(STORAGE_KEYS.session, s, tab);
