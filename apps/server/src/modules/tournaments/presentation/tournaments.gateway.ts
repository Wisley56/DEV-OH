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
import { Throttle } from '../../../common/security/throttle.js';
import { WsAckFilter } from '../../../common/ws-ack.filter.js';
import { ZodValidationPipe } from '../../../common/zod-validation.pipe.js';
import { RoomsService } from '../../rooms/application/rooms.service.js';
import { playerOf, roomOf, setRoom, setTournament, tournamentOf } from '../../rooms/presentation/socket-session.js';
import { TournamentsService } from '../application/tournaments.service.js';
import { SocketTournamentNotifier } from './socket-tournament.notifier.js';

/** Eventos do torneio: inscrição, início, saída e reconexão. As jogadas usam o `action` de sempre. */
@WebSocketGateway()
@UseFilters(WsAckFilter)
export class TournamentsGateway implements OnGatewayInit, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;

  constructor(
    @Inject(TournamentsService) private readonly tournaments: TournamentsService,
    @Inject(RoomsService) private readonly rooms: RoomsService,
    @Inject(SocketTournamentNotifier) private readonly notifier: SocketTournamentNotifier,
  ) {}

  afterInit(server: Server) {
    this.notifier.attach(server);
  }

  @SubscribeMessage(EVENTS.createTournament)
  @Throttle('create')
  create(
    @ConnectedSocket() socket: Socket,
    @MessageBody(new ZodValidationPipe(CreateRoomSchema, 'Deck inválido.')) msg: CreateRoomPayload,
  ): Ack {
    this.leaveCurrent(socket);
    const session = this.tournaments.create(socket.id, playerOf(socket), msg.deck, msg.private);
    setTournament(socket, session.code);
    return { ok: true, ...session };
  }

  @SubscribeMessage(EVENTS.joinTournament)
  @Throttle('join')
  join(@ConnectedSocket() socket: Socket, @MessageBody(new ZodValidationPipe(JoinRoomSchema, 'Deck inválido.')) msg: JoinRoomPayload): Ack {
    this.leaveCurrent(socket, msg.code);
    const session = this.tournaments.join(socket.id, msg.code, playerOf(socket), msg.deck);
    setTournament(socket, session.code);
    return { ok: true, ...session };
  }

  @SubscribeMessage(EVENTS.rejoinTournament)
  @Throttle('join')
  rejoin(
    @ConnectedSocket() socket: Socket,
    @MessageBody(new ZodValidationPipe(RejoinRoomSchema, 'Esse torneio não existe mais.')) msg: RejoinRoomPayload,
  ): Ack {
    this.leaveCurrent(socket, msg.code);
    const session = this.tournaments.rejoin(socket.id, msg.code, playerOf(socket).userId);
    setTournament(socket, session.code);
    return { ok: true, ...session };
  }

  @SubscribeMessage(EVENTS.startTournament)
  @Throttle('room')
  start(@ConnectedSocket() socket: Socket): Ack {
    this.tournaments.start(tournamentOf(socket), socket.id);
    return { ok: true };
  }

  @SubscribeMessage(EVENTS.leaveTournament)
  @Throttle('room')
  leave(@ConnectedSocket() socket: Socket) {
    this.tournaments.leave(tournamentOf(socket), socket.id);
    setTournament(socket, undefined);
  }

  handleDisconnect(socket: Socket) {
    this.tournaments.disconnect(tournamentOf(socket), socket.id);
  }

  /** Uma conexão fica num lugar só: ao entrar no torneio, sai da sala ou do torneio atual. */
  private leaveCurrent(socket: Socket, next?: string) {
    const room = roomOf(socket);
    if (room) {
      this.rooms.leave(room, socket.id);
      setRoom(socket, undefined);
    }
    const current = tournamentOf(socket);
    if (!current || current === next?.toUpperCase()) return;
    this.tournaments.leave(current, socket.id);
    setTournament(socket, undefined);
  }
}
