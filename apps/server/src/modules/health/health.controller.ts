import { Controller, Get, Header } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get('health')
  health() {
    return { ok: true };
  }

  @Get()
  @Header('content-type', 'text/plain; charset=utf-8')
  root() {
    return 'DEV-OH! servidor de duelos no ar.';
  }
}
