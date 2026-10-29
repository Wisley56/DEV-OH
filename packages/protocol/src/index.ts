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

export interface CreateRoomPayload {
  name?: string;
  deck: string[];
}

export interface JoinRoomPayload {
  code: string;
  name?: string;
  deck: string[];
}

export interface RejoinRoomPayload {
  code: string;
  token: string;
}

/** Resposta (ack) de toda chamada cliente → servidor. */
export type Ack = { ok: true; code?: string; token?: string } | { ok: false; error: string };

export interface RoomPlayer {
  name: string;
  connected: boolean;
}

/** Estado da sala enviado a cada jogador, com a visão do duelo filtrada para ele. */
export interface RoomState {
  code: string;
  seat: Seat;
  status: 'waiting' | 'playing';
  players: (RoomPlayer | null)[];
  rematch: [boolean, boolean];
  view: GameView | null;
}

/** Sessão guardada no navegador para reconectar (código da sala + token do assento). */
export interface RoomSession {
  code: string;
  token: string;
}

export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const ROOM_CODE_LENGTH = 5;
export { DEFAULT_NAME, NAME_MAX, sanitizeName } from './name';
