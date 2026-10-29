import type { Action } from '@devoh/engine';
import type { RoomState } from '@devoh/protocol';
import { create } from 'zustand';
import { RoomClient, type ConnectionStatus } from '../services/roomClient';
import { getSession, NEW_ROOM } from '../services/session';

export { NEW_ROOM };

interface JoinAs {
  name: string;
  deck: string[];
  private?: boolean;
}

interface RoomStoreState {
  status: ConnectionStatus | 'idle' | 'needsJoin';
  room: RoomState | null;
  /** Diferença entre o relógio do servidor e o deste navegador (ms). */
  clockOffset: number;
  error: string | null;
  /** Sala a que este navegador está ligado (código definitivo, ou "nova" enquanto cria). */
  activeCode: string | null;
  /** Liga-se à sala da URL. `joinAs` = entrar com apelido/deck se não houver sessão para reconectar. */
  open(code: string, joinAs?: JoinAs): void;
  send(action: Action): Promise<string | null>;
  rematch(): void;
  /** Sai da sala de vez e desconecta. */
  leave(): void;
  /** Só desconecta (ao sair da página); dá para voltar pelo token. */
  close(): void;
}

let client: RoomClient | null = null;

const initial = { status: 'idle' as const, room: null, error: null, activeCode: null, clockOffset: 0 };

/** Conexão com a sala online (uma por aba). */
export const useRoomStore = create<RoomStoreState>((set, get) => ({
  ...initial,
  open(code, joinAs) {
    const target = code === NEW_ROOM ? NEW_ROOM : code.toUpperCase();
    if (get().activeCode === target) return;
    client?.disconnect();
    set({ ...initial, status: 'connecting', activeCode: target });
    if (target !== NEW_ROOM && !joinAs && getSession()?.code !== target) {
      set({ status: 'needsJoin' });
      return;
    }
    client = new RoomClient({
      state: (room) => set({ room, clockOffset: room.serverNow ? room.serverNow - Date.now() : 0 }),
      status: (status) => set({ status }),
      error: (error) => set({ error }),
      entered: (activeCode) => set({ activeCode }),
      needsJoin: () => set({ status: 'needsJoin' }),
    });
    if (target === NEW_ROOM) client.connect({ kind: 'create', ...joinAs! });
    else if (joinAs) client.connect({ kind: 'join', code: target, ...joinAs });
    else client.connect({ kind: 'rejoin', code: target });
  },
  send: (action) => client?.send(action) ?? Promise.resolve('Sem conexão com o servidor.'),
  rematch: () => client?.rematch(),
  leave() {
    client?.leave();
    get().close();
  },
  close() {
    client?.disconnect();
    client = null;
    set(initial);
  },
}));
