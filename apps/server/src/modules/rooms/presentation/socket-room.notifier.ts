import { EVENTS } from '@devoh/protocol';
import type { Seat } from '@devoh/engine';
import { Injectable } from '@nestjs/common';
import type { Server } from 'socket.io';
import type { RoomNotifier } from '../application/ports.js';
import { roomStateFor } from '../application/room-state.js';
import type { Room } from '../domain/room.js';

/** Emite `room:state` para cada jogador conectado, com a visão do seu assento. */
@Injectable()
export class SocketRoomNotifier implements RoomNotifier {
  private server: Server | null = null;

  attach(server: Server) {
    this.server = server;
  }

  publish(room: Room) {
    room.players.forEach((p, i) => {
      if (!p?.socketId) return;
      this.server?.to(p.socketId).emit(EVENTS.roomState, roomStateFor(room, i as Seat));
    });
  }
}
