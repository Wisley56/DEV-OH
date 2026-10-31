import { Inject, Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { AppConfig } from '../../config/app-config.js';
import { DomainError } from '../domain-error.js';
import { clientIp } from './client-ip.js';
import { SecurityLog } from './security-log.js';

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Contra CSRF, além do cookie SameSite=Strict: todo pedido HTTP que altera dados precisa
 * vir de uma origem da lista (CORS_ORIGIN). Fora de produção, sem lista ("*"), passa.
 */
@Injectable()
export class OriginGuard implements CanActivate {
  constructor(
    @Inject(AppConfig) private readonly config: AppConfig,
    @Inject(SecurityLog) private readonly log: SecurityLog,
  ) {}

  canActivate(ctx: ExecutionContext): boolean {
    if (ctx.getType() !== 'http') return true;
    const req = ctx.switchToHttp().getRequest<Request>();
    if (SAFE.has(req.method)) return true;
    const origin = req.headers.origin;
    if (this.config.corsOrigin === true || this.config.allowsOrigin(origin)) return true;
    this.log.warn(
      'origin-refused',
      clientIp({ address: req.socket.remoteAddress ?? '', headers: req.headers }, this.config.trustProxyHops),
      {
        origin,
        path: req.path,
      },
    );
    throw new DomainError('Origem não permitida.', 403);
  }
}
