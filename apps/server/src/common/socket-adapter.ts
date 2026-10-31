import type { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import type { Server, ServerOptions } from 'socket.io';
import { AppConfig } from '../config/app-config.js';
import { AccountsService } from '../modules/accounts/application/accounts.service.js';
import { SessionCookie } from '../modules/accounts/presentation/session-cookie.js';
import { setPlayer } from '../modules/rooms/presentation/socket-session.js';
import { clientIp } from './security/client-ip.js';
import { ConnectionCounter } from './security/rate-limiter.js';
import { SecurityLog } from './security/security-log.js';

/**
 * Socket.IO com CORS vindo da configuração, checagem de origem também no
 * WebSocket (que o CORS não cobre), limite de conexões por IP e de tamanho de mensagem.
 * Jogar online exige conta: o handshake sem cookie de sessão válido é recusado.
 */
export class AppSocketAdapter extends IoAdapter {
  constructor(private readonly ctx: INestApplicationContext) {
    super(ctx);
  }

  override createIOServer(port: number, options?: ServerOptions) {
    const config = this.ctx.get(AppConfig);
    const conns = this.ctx.get(ConnectionCounter);
    const log = this.ctx.get(SecurityLog);
    const accounts = this.ctx.get(AccountsService);
    const cookie = this.ctx.get(SessionCookie);
    const opts = {
      ...options,
      cors: { origin: config.corsOrigin },
      maxHttpBufferSize: 16 * 1024,
      allowRequest: (req, done) => {
        const ok = config.allowsOrigin(req.headers.origin);
        if (!ok)
          log.warn('origin-refused', clientIp({ address: req.socket.remoteAddress ?? '', headers: req.headers }, config.trustProxyHops), {
            origin: req.headers.origin,
          });
        done(null, ok);
      },
    } as ServerOptions;
    const server = super.createIOServer(port, opts) as Server;
    server.use((socket, next) => {
      const ip = clientIp(socket.handshake, config.trustProxyHops);
      if (!conns.acquire(ip, config.maxConnPerIp)) {
        log.warn('conn-limit', ip);
        return next(new Error('Conexões demais deste endereço.'));
      }
      (socket.data as { ip?: string }).ip = ip;
      socket.once('disconnect', () => conns.release(ip));
      next();
    });
    server.use((socket, next) => {
      accounts
        .resolve(cookie.read(socket.handshake.headers.cookie))
        .then((session) => {
          if (!session) {
            conns.release((socket.data as { ip: string }).ip);
            return next(new Error('Entre na sua conta para jogar online.'));
          }
          setPlayer(socket, { userId: session.user.id, name: session.user.displayName });
          next();
        })
        .catch(() => {
          conns.release((socket.data as { ip: string }).ip);
          next(new Error('Servidor indisponível agora. Tenta de novo daqui a pouco.'));
        });
    });
    return server;
  }
}
