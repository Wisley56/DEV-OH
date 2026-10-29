import { Injectable } from '@nestjs/common';
import type { RoomRepository } from '../application/ports.js';
import type { Room } from '../domain/room.js';

/** Salas em memória: o servidor é uma instância só (o duelo some se ele reiniciar). */
@Injectable()
export class InMemoryRoomRepository implements RoomRepository {
  private readonly rooms = new Map<string, Room>();

  get(code: string) {
    return this.rooms.get(code);
  }
  has(code: string) {
    return this.rooms.has(code);
  }
  save(room: Room) {
    this.rooms.set(room.code, room);
  }
  delete(code: string) {
    this.rooms.delete(code);
  }
  all() {
    return this.rooms.values();
  }
  count() {
    return this.rooms.size;
  }
}
