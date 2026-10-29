import { Controller, Get, Header, Inject } from '@nestjs/common';
import { RoomsService } from '../rooms/application/rooms.service.js';

@Controller()
export class HealthController {
  constructor(@Inject(RoomsService) private readonly rooms: RoomsService) {}

  @Get('health')
  health() {
    return { ok: true, rooms: this.rooms.count() };
  }

  @Get()
  @Header('content-type', 'text/plain; charset=utf-8')
  root() {
    return 'DEV-OH! servidor de duelos no ar.';
  }
}
