import type { Room } from '../domain/room.js';

/** Portas da aplicação de salas: implementadas na infraestrutura/apresentação. */

export interface RoomRepository {
  get(code: string): Room | undefined;
  has(code: string): boolean;
  save(room: Room): void;
  delete(code: string): void;
  all(): Iterable<Room>;
  count(): number;
}

export interface IdGenerator {
  roomCode(): string;
  token(): string;
}

export interface Clock {
  now(): number;
}

/** Envia a cada jogador conectado o estado atual da sala. */
export interface RoomNotifier {
  publish(room: Room): void;
}

export const ROOM_REPOSITORY = Symbol('RoomRepository');
export const ID_GENERATOR = Symbol('IdGenerator');
export const CLOCK = Symbol('Clock');
export const ROOM_NOTIFIER = Symbol('RoomNotifier');
