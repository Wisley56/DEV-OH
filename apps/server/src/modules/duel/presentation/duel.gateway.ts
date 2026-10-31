import type { Action } from '@devoh/engine';
import { EVENTS, type Ack } from '@devoh/protocol';
import { ActionSchema } from '@devoh/protocol/schemas';
import { Inject, UseFilters } from '@nestjs/common';
import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';
import type { Socket } from 'socket.io';
import { Throttle } from '../../../common/security/throttle.js';
import { WsAckFilter } from '../../../common/ws-ack.filter.js';
import { ZodValidationPipe } from '../../../common/zod-validation.pipe.js';
import { roomOf, tournamentOf } from '../../rooms/presentation/socket-session.js';
import { TournamentsService } from '../../tournaments/application/tournaments.service.js';
import { DuelService } from '../application/duel.service.js';

/** Jogadas do duelo (da sala VS ou do duelo atual do torneio). */
@WebSocketGateway()
@UseFilters(WsAckFilter)
export class DuelGateway {
  constructor(
    @Inject(DuelService) private readonly duel: DuelService,
    @Inject(TournamentsService) private readonly tournaments: TournamentsService,
  ) {}

  @SubscribeMessage(EVENTS.action)
  @Throttle('action')
  act(@ConnectedSocket() socket: Socket, @MessageBody(new ZodValidationPipe(ActionSchema, 'Ação inválida.')) action: Action): Ack {
    const code = roomOf(socket) ?? this.tournaments.matchCodeFor(tournamentOf(socket), socket.id);
    this.duel.play(code, socket.id, action);
    return { ok: true };
  }
}
