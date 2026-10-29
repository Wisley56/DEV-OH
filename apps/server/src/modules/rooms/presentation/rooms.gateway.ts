import { EVENTS, type Ack, type CreateRoomPayload, type JoinRoomPayload, type RejoinRoomPayload } from '@devoh/protocol';
import { CreateRoomSchema, JoinRoomSchema, RejoinRoomSchema } from '@devoh/protocol/schemas';
import { Inject, UseFilters } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  type OnGatewayDisconnect,
  type OnGatewayInit,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { WsAckFilter } from '../../../common/ws-ack.filter.js';
import { ZodValidationPipe } from '../../../common/zod-validation.pipe.js';
import { RoomsService } from '../application/rooms.service.js';
import { roomOf, setRoom } from './socket-session.js';
import { SocketRoomNotifier } from './socket-room.notifier.js';

/** Eventos de ciclo de vida da sala. */
@WebSocketGateway()
@UseFilters(WsAckFilter)
export class RoomsGateway implements OnGatewayInit, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;

  constructor(
    @Inject(RoomsService) private readonly rooms: RoomsService,
    @Inject(SocketRoomNotifier) private readonly notifier: SocketRoomNotifier,
  ) {}

  afterInit(server: Server) {
    this.notifier.attach(server);
  }

  @SubscribeMessage(EVENTS.createRoom)
  create(
    @ConnectedSocket() socket: Socket,
    @MessageBody(new ZodValidationPipe(CreateRoomSchema, 'Deck inválido.')) msg: CreateRoomPayload,
  ): Ack {
    const session = this.rooms.create(socket.id, msg.name, msg.deck);
    setRoom(socket, session.code);
    return { ok: true, ...session };
  }

  @SubscribeMessage(EVENTS.joinRoom)
  join(@ConnectedSocket() socket: Socket, @MessageBody(new ZodValidationPipe(JoinRoomSchema, 'Deck inválido.')) msg: JoinRoomPayload): Ack {
    const session = this.rooms.join(socket.id, msg.code, msg.name, msg.deck);
    setRoom(socket, session.code);
    return { ok: true, ...session };
  }

  @SubscribeMessage(EVENTS.rejoinRoom)
  rejoin(
    @ConnectedSocket() socket: Socket,
    @MessageBody(new ZodValidationPipe(RejoinRoomSchema, 'Sessão expirada.')) msg: RejoinRoomPayload,
  ): Ack {
    const session = this.rooms.rejoin(socket.id, msg.code, msg.token);
    setRoom(socket, session.code);
    return { ok: true, ...session };
  }

  @SubscribeMessage(EVENTS.rematch)
  rematch(@ConnectedSocket() socket: Socket) {
    this.rooms.rematch(roomOf(socket), socket.id);
  }

  @SubscribeMessage(EVENTS.leaveRoom)
  leave(@ConnectedSocket() socket: Socket) {
    this.rooms.leave(roomOf(socket), socket.id);
    setRoom(socket, undefined);
  }

  handleDisconnect(socket: Socket) {
    this.rooms.disconnect(roomOf(socket), socket.id);
  }
}
