import {
  applyDecorators,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  SetMetadata,
  UseGuards,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { IncomingMessage } from 'node:http';
import type { Socket } from 'socket.io';
import { AppConfig, type RateBucket } from '../../config/app-config.js';
import { DomainError } from '../domain-error.js';
import { clientIp } from './client-ip.js';
import { RateLimiter } from './rate-limiter.js';
import { SecurityLog } from './security-log.js';

const THROTTLE = 'devoh:throttle';

/** Baldes contados por IP; os demais, por conexão. */
const PER_IP: ReadonlySet<RateBucket> = new Set(['create', 'join', 'list']);

export const TOO_MANY = 'Calma! Muitas tentativas, espera um pouco.';

/** IP do cliente, gravado no socket na conexão (ver AppSocketAdapter). */
export const ipOf = (socket: Socket) => (socket.data as { ip?: string }).ip ?? socket.handshake.address;

/** Limita a taxa do evento de socket ou da rota HTTP pelo balde dado. */
export const Throttle = (bucket: RateBucket) => applyDecorators(SetMetadata(THROTTLE, bucket), UseGuards(ThrottleGuard));

/**
 * Barra o pedido quando o balde esgota. No socket, vira `{ok:false}` no ack e quem
 * insiste em ser barrado é desconectado; no HTTP, responde 429.
 */
@Injectable()
export class ThrottleGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(RateLimiter) private readonly limiter: RateLimiter,
    @Inject(AppConfig) private readonly config: AppConfig,
    @Inject(SecurityLog) private readonly log: SecurityLog,
  ) {}

  canActivate(ctx: ExecutionContext): boolean {
    const bucket = this.reflector.get<RateBucket | undefined>(THROTTLE, ctx.getHandler());
    if (!bucket) return true;

    if (ctx.getType() === 'http') {
      const req = ctx.switchToHttp().getRequest<IncomingMessage>();
      const ip = clientIp({ address: req.socket.remoteAddress ?? '', headers: req.headers }, this.config.trustProxyHops);
      if (this.limiter.take(`${bucket}:${ip}`, this.config.rates[bucket])) return true;
      this.log.warn('rate-limited', ip, { bucket });
      throw new HttpException(TOO_MANY, HttpStatus.TOO_MANY_REQUESTS);
    }

    const socket = ctx.switchToWs().getClient<Socket>();
    const ip = ipOf(socket);
    const who = PER_IP.has(bucket) ? ip : socket.id;
    if (this.limiter.take(`${bucket}:${who}`, this.config.rates[bucket])) return true;

    this.log.warn('rate-limited', ip, { bucket });
    if (!this.limiter.take(`strikes:${socket.id}`, this.config.rates.strikes)) {
      this.log.warn('kicked', ip, { bucket });
      setImmediate(() => socket.disconnect(true));
    }
    throw new DomainError(TOO_MANY);
  }
}
