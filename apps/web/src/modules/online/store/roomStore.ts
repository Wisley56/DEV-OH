import type { Action } from '@devoh/engine';
import { isTournamentCode, type RoomState, type TournamentState } from '@devoh/protocol';
import { create } from 'zustand';
import { RoomClient, type ConnectionStatus, type RoomMode } from '../services/roomClient';
import { NEW_ROOM } from '../services/session';

export { NEW_ROOM };

interface JoinAs {
  deck: string[];
  private?: boolean;
  /** Ao criar: VS (1x1) ou torneio. */
  mode?: RoomMode;
}

interface RoomStoreState {
  status: ConnectionStatus | 'idle' | 'needsJoin';
  room: RoomState | null;
  /** Torneio em que está (os duelos dele chegam em `matches`, por código da sala). */
  tournament: TournamentState | null;
  matches: Record<string, RoomState>;
  /** Diferença entre o relógio do servidor e o deste navegador (ms). */
  clockOffset: number;
  error: string | null;
  /** Sala a que este navegador está ligado (código definitivo, ou "nova" enquanto cria). */
  activeCode: string | null;
  /** Liga-se à sala da URL. `joinAs` = entrar com este deck se a conta ainda não tiver lugar na sala. */
  open(code: string, joinAs?: JoinAs): void;
  send(action: Action): Promise<string | null>;
  rematch(): void;
  /** Anfitrião inicia o torneio; resolve com a mensagem de erro, ou null. */
  startTournament(): Promise<string | null>;
  /** Sai da sala de vez e desconecta. */
  leave(): void;
  /** Só desconecta (ao sair da página); dá para voltar pela conta. */
  close(): void;
}

let client: RoomClient | null = null;

const initial = { status: 'idle' as const, room: null, tournament: null, matches: {}, error: null, activeCode: null, clockOffset: 0 };
const offsetOf = (serverNow: number) => (serverNow ? serverNow - Date.now() : 0);

/** Conexão com a sala online (uma por aba). */
export const useRoomStore = create<RoomStoreState>((set, get) => ({
  ...initial,
  open(code, joinAs) {
    const target = code === NEW_ROOM ? NEW_ROOM : code.toUpperCase();
    if (get().activeCode === target) return;
    client?.disconnect();
    set({ ...initial, status: 'connecting', activeCode: target });
    client = new RoomClient({
      // No torneio, cada duelo é uma sala própria: guarda o último estado de cada uma.
      state: (room) =>
        get().tournament || isTournamentCode(target)
          ? set((s) => ({ matches: { ...s.matches, [room.code]: room }, clockOffset: offsetOf(room.serverNow) }))
          : set({ room, clockOffset: offsetOf(room.serverNow) }),
      tournament: (tournament) => set({ tournament, clockOffset: offsetOf(tournament.serverNow) }),
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
  startTournament: () => client?.startTournament() ?? Promise.resolve('Sem conexão com o servidor.'),
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
