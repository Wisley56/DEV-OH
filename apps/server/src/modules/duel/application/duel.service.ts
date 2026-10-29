import { applyAction, type Action } from '@devoh/engine';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { DomainError } from '../../../common/domain-error.js';
import { RoomsService } from '../../rooms/application/rooms.service.js';

/** Caso de uso do duelo: o servidor é a autoridade e valida cada jogada no engine. */
@Injectable()
export class DuelService {
  private readonly logger = new Logger('DuelService');

  constructor(@Inject(RoomsService) private readonly rooms: RoomsService) {}

  play(code: string | undefined, socketId: string, action: Action) {
    const { room, seat } = this.rooms.locate(code, socketId);
    if (!room?.game) throw new DomainError('Nenhum duelo em andamento.');
    if (seat === null) throw new DomainError('Você não está nesta sala.');
    let r;
    try {
      r = applyAction(room.game, seat, action);
    } catch (e) {
      this.logger.error(`Erro aplicando ação na sala ${room.code}: ${JSON.stringify(action)}`, e instanceof Error ? e.stack : String(e));
      throw new DomainError('Erro interno no servidor.');
    }
    if (!r.ok) throw new DomainError(r.error);
    room.game = r.state;
    this.rooms.publish(room);
  }
}
