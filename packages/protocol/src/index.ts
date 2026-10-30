import type { GameView, Seat } from '@devoh/engine';

/**
 * Contrato de rede entre o navegador e o servidor de duelos (Socket.IO).
 * Este módulo só tem tipos e constantes; os schemas de validação ficam em
 * `@devoh/protocol/schemas`, para o front não carregar o zod sem precisar.
 */

/** Eventos cliente → servidor (com ack) e servidor → cliente. */
export const EVENTS = {
  createRoom: 'room:create',
  joinRoom: 'room:join',
  rejoinRoom: 'room:rejoin',
  rematch: 'room:rematch',
  leaveRoom: 'room:leave',
  action: 'action',
  roomState: 'room:state',
} as const;

/** O nome na sala é o da conta (o servidor sabe quem é pelo cookie de sessão). */
export interface CreateRoomPayload {
  deck: string[];
  /** Sala privada: não aparece na lista de salas abertas do lobby. */
  private?: boolean;
}

/** Sala pública esperando oponente (GET /rooms). */
export interface OpenRoom {
  code: string;
  host: string;
  /** Há quanto tempo a sala espera (ms). */
  waitingMs: number;
}

export interface JoinRoomPayload {
  code: string;
  deck: string[];
}

/** Volta para a sala depois de cair (F5, rede): o assento é reconhecido pela conta. */
export interface RejoinRoomPayload {
  code: string;
}

/** Resposta (ack) de toda chamada cliente → servidor. */
export type Ack = { ok: true; code?: string } | { ok: false; error: string };

export interface RoomPlayer {
  name: string;
  connected: boolean;
  /** Caiu no meio do duelo: horário (relógio do servidor, ms) em que perde por W.O. se não voltar. */
  reconnectDeadline: number | null;
  /** Variação de Elo da última partida (só depois que ela termina e é registrada). */
  eloDelta: number | null;
}

/** Estado da sala enviado a cada jogador, com a visão do duelo filtrada para ele. */
export interface RoomState {
  code: string;
  seat: Seat;
  status: 'waiting' | 'playing';
  players: (RoomPlayer | null)[];
  rematch: [boolean, boolean];
  view: GameView | null;
  /** Fim do prazo do turno atual (relógio do servidor, ms); null fora de duelo. */
  turnDeadline: number | null;
  /** Relógio do servidor no envio: o cliente corrige a diferença para o próprio relógio. */
  serverNow: number;
}

export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const ROOM_CODE_LENGTH = 5;
export { DEFAULT_NAME, NAME_MAX, sanitizeName } from './name';
export * from './account';
