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

/** Agenda tarefas por chave (agendar de novo a mesma chave substitui a anterior). */
export interface Scheduler {
  schedule(key: string, at: number, task: () => void): void;
  cancel(key: string): void;
}

/** Envia a cada jogador conectado o estado atual da sala. */
export interface RoomNotifier {
  publish(room: Room): void;
}

export const ROOM_REPOSITORY = Symbol('RoomRepository');
export const ID_GENERATOR = Symbol('IdGenerator');
export const CLOCK = Symbol('Clock');
export const SCHEDULER = Symbol('Scheduler');
export const ROOM_NOTIFIER = Symbol('RoomNotifier');
