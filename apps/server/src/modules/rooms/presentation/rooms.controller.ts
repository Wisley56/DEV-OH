import type { OpenRoom } from '@devoh/protocol';
import { Controller, Get, Header, Inject } from '@nestjs/common';
import { Throttle } from '../../../common/security/throttle.js';
import { RoomsService } from '../application/rooms.service.js';

/** Salas públicas para o lobby (HTTP: a home não precisa abrir socket só para listar). */
@Controller('rooms')
export class RoomsController {
  constructor(@Inject(RoomsService) private readonly rooms: RoomsService) {}

  @Get()
  @Throttle('list')
  @Header('cache-control', 'no-store')
  list(): OpenRoom[] {
    return this.rooms.listOpen();
  }
}
