import type { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import type { ServerOptions } from 'socket.io';
import { AppConfig } from '../config/app-config.js';

/** Socket.IO com CORS vindo da configuração e limite de tamanho de mensagem. */
export class AppSocketAdapter extends IoAdapter {
  constructor(private readonly ctx: INestApplicationContext) {
    super(ctx);
  }

  override createIOServer(port: number, options?: ServerOptions) {
    const config = this.ctx.get(AppConfig);
    const opts = { ...options, cors: { origin: config.corsOrigin }, maxHttpBufferSize: 64 * 1024 } as ServerOptions;
    return super.createIOServer(port, opts);
  }
}
