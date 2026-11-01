import { applyDecorators, Inject, Injectable, UseGuards, type CanActivate, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { DomainError } from '../../../common/domain-error.js';
import { clientIp } from '../../../common/security/client-ip.js';
import { SecurityLog } from '../../../common/security/security-log.js';
import { AppConfig } from '../../../config/app-config.js';
import type { UserRecord } from '../application/ports.js';
import { AuthGuard } from './auth.guard.js';

/** Barra quem está logado mas não é admin (roda depois do AuthGuard, que resolve a conta). */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    @Inject(AppConfig) private readonly config: AppConfig,
    @Inject(SecurityLog) private readonly log: SecurityLog,
  ) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request & { account?: UserRecord }>();
    if (req.account?.isAdmin) return true;
    const ip = clientIp({ address: req.socket.remoteAddress ?? '', headers: req.headers }, this.config.trustProxyHops);
    this.log.warn('admin-denied', ip, { path: req.path });
    throw new DomainError('Só administradores podem fazer isso.', 403);
  }
}

/** Rota do painel admin: exige sessão (401) e conta admin (403). */
export const AdminOnly = () => applyDecorators(UseGuards(AuthGuard, AdminGuard));
