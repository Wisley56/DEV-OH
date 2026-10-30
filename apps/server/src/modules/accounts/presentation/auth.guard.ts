import { createParamDecorator, Inject, Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import type { Request, Response } from 'express';
import { DomainError } from '../../../common/domain-error.js';
import { AccountsService } from '../application/accounts.service.js';
import type { UserRecord } from '../application/ports.js';
import { SessionCookie } from './session-cookie.js';

type AuthedRequest = Request & { account?: UserRecord };

/** Rota só para quem está logado: resolve o cookie de sessão e guarda a conta no pedido. */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(AccountsService) private readonly accounts: AccountsService,
    @Inject(SessionCookie) private readonly cookie: SessionCookie,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const http = ctx.switchToHttp();
    const req = http.getRequest<AuthedRequest>();
    const token = this.cookie.read(req.headers.cookie);
    const session = await this.accounts.resolve(token);
    if (!session) throw new DomainError('Entre na sua conta.', 401);
    req.account = session.user;
    // Sessão renovada: reenvia o cookie com o prazo novo.
    if (session.renewed && token) this.cookie.set(http.getResponse<Response>(), token);
    return true;
  }
}

/** A conta logada (use junto com o AuthGuard). */
export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): UserRecord => {
  return ctx.switchToHttp().getRequest<AuthedRequest>().account!;
});
