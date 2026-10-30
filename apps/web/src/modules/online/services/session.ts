import { readJson, removeKey, STORAGE_KEYS, writeJson } from '../../../shared/lib/storage';

/**
 * Sala em que esta aba está, para o botão "voltar para o duelo" depois de um F5. Só o
 * código (que já está na URL): quem prova o lugar na sala é a conta, pelo cookie.
 * Por aba (sessionStorage), para duas abas não disputarem a mesma sala.
 */
const tab = () => sessionStorage;

/** Código de rota que cria uma sala nova (/sala/nova). */
export const NEW_ROOM = 'nova';

// Versões antigas guardavam aqui o token do assento: não serve mais e não fica no navegador.
removeKey(STORAGE_KEYS.legacySession, tab);

export const getActiveRoom = () => readJson<string | null>(STORAGE_KEYS.room, null, tab);
export const setActiveRoom = (code: string | null) => (code ? writeJson(STORAGE_KEYS.room, code, tab) : removeKey(STORAGE_KEYS.room, tab));
