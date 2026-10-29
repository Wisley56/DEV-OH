import type { Action } from '@devoh/engine';
import { EVENTS, type Ack } from '@devoh/protocol';
import { ActionSchema } from '@devoh/protocol/schemas';
import { Inject, UseFilters } from '@nestjs/common';
import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';
import type { Socket } from 'socket.io';
import { WsAckFilter } from '../../../common/ws-ack.filter.js';
import { ZodValidationPipe } from '../../../common/zod-validation.pipe.js';
import { roomOf } from '../../rooms/presentation/socket-session.js';
import { DuelService } from '../application/duel.service.js';

/** Jogadas do duelo. */
@WebSocketGateway()
@UseFilters(WsAckFilter)
export class DuelGateway {
  constructor(@Inject(DuelService) private readonly duel: DuelService) {}

  @SubscribeMessage(EVENTS.action)
  act(@ConnectedSocket() socket: Socket, @MessageBody(new ZodValidationPipe(ActionSchema, 'Ação inválida.')) action: Action): Ack {
    this.duel.play(roomOf(socket), socket.id, action);
    return { ok: true };
  }
}
