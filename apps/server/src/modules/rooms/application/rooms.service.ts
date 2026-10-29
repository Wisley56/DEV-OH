import { validateDeck } from '@devoh/engine';
import { sanitizeName, type RoomSession } from '@devoh/protocol';
import { Inject, Injectable } from '@nestjs/common';
import { DomainError } from '../../../common/domain-error.js';
import { SecurityLog } from '../../../common/security/security-log.js';
import { AppConfig } from '../../../config/app-config.js';
import { Room, type Seatholder } from '../domain/room.js';
import {
  CLOCK,
  ID_GENERATOR,
  ROOM_NOTIFIER,
  ROOM_REPOSITORY,
  type Clock,
  type IdGenerator,
  type RoomNotifier,
  type RoomRepository,
} from './ports.js';

/** Casos de uso do ciclo de vida das salas (criar, entrar, reconectar, sair, revanche). */
@Injectable()
export class RoomsService {
  constructor(
    @Inject(ROOM_REPOSITORY) private readonly rooms: RoomRepository,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ROOM_NOTIFIER) private readonly notifier: RoomNotifier,
    @Inject(AppConfig) private readonly config: AppConfig,
    @Inject(SecurityLog) private readonly security: SecurityLog,
  ) {}

  create(socketId: string, name: string | undefined, deck: string[]): RoomSession {
    this.checkDeck(deck);
    if (this.rooms.count() >= this.config.maxRooms) {
      this.security.warn('room-limit', undefined, { rooms: this.rooms.count() });
      throw new DomainError('Servidor lotado agora. Tenta de novo daqui a pouco.');
    }
    let code = this.ids.roomCode();
    while (this.rooms.has(code)) code = this.ids.roomCode();
    const room = new Room(code, this.seat(socketId, name, deck), this.clock.now());
    this.rooms.save(room);
    this.publish(room);
    return { code, token: room.players[0].token };
  }

  join(socketId: string, code: string, name: string | undefined, deck: string[]): RoomSession {
    const room = this.rooms.get(code.toUpperCase());
    if (!room) throw new DomainError('Sala não encontrada. Confere o código?');
    if (room.isFull) throw new DomainError('A sala já está cheia.');
    this.checkDeck(deck);
    const guest = this.seat(socketId, name, deck);
    room.join(guest);
    this.publish(room);
    return { code: room.code, token: guest.token };
  }

  rejoin(socketId: string, code: string, token: string): RoomSession {
    const room = this.rooms.get(code.toUpperCase());
    const p = room?.seatholderByToken(token);
    if (!room || !p) throw new DomainError('Sessão expirada.');
    p.socketId = socketId;
    this.publish(room);
    return { code: room.code, token: p.token };
  }

  /** Sala onde o socket está sentado, com o assento. */
  locate(code: string | undefined, socketId: string) {
    const room = code ? this.rooms.get(code) : undefined;
    const seat = room?.seatOfSocket(socketId) ?? null;
    return { room, seat };
  }

  rematch(code: string | undefined, socketId: string) {
    const { room, seat } = this.locate(code, socketId);
    if (!room || seat === null || !room.game || room.game.winner === null) return;
    room.requestRematch(seat);
    this.publish(room);
  }

  leave(code: string | undefined, socketId: string) {
    const room = code ? this.rooms.get(code) : undefined;
    if (!room) return;
    room.release(socketId);
    if (!room.game) this.rooms.delete(room.code);
    else this.publish(room);
  }

  disconnect(code: string | undefined, socketId: string) {
    const room = code ? this.rooms.get(code) : undefined;
    if (!room) return;
    room.release(socketId);
    this.publish(room);
  }

  /** Atualiza o "visto por último" e avisa os jogadores. */
  publish(room: Room) {
    room.touched = this.clock.now();
    this.notifier.publish(room);
  }

  /** Remove salas paradas; retorna quantas saíram. */
  sweep(ttlMs: number, idleTtlMs: number): number {
    const now = this.clock.now();
    let removed = 0;
    for (const room of [...this.rooms.all()]) {
      if (room.isStale(now, ttlMs, idleTtlMs)) {
        this.rooms.delete(room.code);
        removed++;
      }
    }
    return removed;
  }

  count() {
    return this.rooms.count();
  }

  private seat(socketId: string, name: string | undefined, deck: string[]): Seatholder {
    return { name: sanitizeName(name), deck, token: this.ids.token(), socketId };
  }

  private checkDeck(deck: string[]) {
    const err = validateDeck(deck)[0];
    if (err) throw new DomainError(err);
  }
}
