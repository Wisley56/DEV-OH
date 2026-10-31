import type { AccountView, AuthConfig, ChangePasswordPayload, LoginPayload, RegisterPayload } from '@devoh/protocol';
import { ChangePasswordSchema, LoginSchema, RegisterSchema } from '@devoh/protocol/schemas';
import { Body, Controller, Get, Header, HttpCode, Inject, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { clientIp } from '../../../common/security/client-ip.js';
import { Throttle } from '../../../common/security/throttle.js';
import { ZodValidationPipe } from '../../../common/zod-validation.pipe.js';
import { AppConfig } from '../../../config/app-config.js';
import { AccountsService, toAccountView } from '../application/accounts.service.js';
import type { UserRecord } from '../application/ports.js';
import { AuthGuard, CurrentUser } from './auth.guard.js';
import { SessionCookie } from './session-cookie.js';

/** Cadastro, login e sessão. O token só sai no cookie HttpOnly, nunca no corpo. */
@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AccountsService) private readonly accounts: AccountsService,
    @Inject(SessionCookie) private readonly cookie: SessionCookie,
    @Inject(AppConfig) private readonly config: AppConfig,
  ) {}

  @Get('config')
  authConfig(): AuthConfig {
    return { turnstileSiteKey: this.config.turnstile.siteKey };
  }

  @Post('register')
  @Throttle('auth')
  @Header('cache-control', 'no-store')
  async register(
    @Body(new ZodValidationPipe(RegisterSchema)) body: RegisterPayload,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AccountView> {
    const { account, token } = await this.accounts.register(body, this.ip(req));
    this.cookie.set(res, token);
    return account;
  }

  @Post('login')
  @HttpCode(200)
  @Throttle('auth')
  @Header('cache-control', 'no-store')
  async login(
    @Body(new ZodValidationPipe(LoginSchema)) body: LoginPayload,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AccountView> {
    const { account, token } = await this.accounts.login(body, this.ip(req));
    this.cookie.set(res, token);
    return account;
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.accounts.logout(this.cookie.read(req.headers.cookie));
    this.cookie.clear(res);
  }

  /** Quem está logado; visitante recebe null (200, para o site não registrar erro a cada visita). */
  @Get('me')
  @Header('cache-control', 'no-store')
  async me(@Req() req: Request, @Res() res: Response) {
    const token = this.cookie.read(req.headers.cookie);
    const session = await this.accounts.resolve(token);
    if (session?.renewed && token) this.cookie.set(res, token);
    // res.json: o Nest mandaria corpo vazio para null, e o cliente espera JSON.
    const body: AccountView | null = session ? toAccountView(session.user) : null;
    res.json(body);
  }

  @Post('password')
  @HttpCode(204)
  @Throttle('auth')
  @UseGuards(AuthGuard)
  async changePassword(
    @CurrentUser() user: UserRecord,
    @Body(new ZodValidationPipe(ChangePasswordSchema)) body: ChangePasswordPayload,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.cookie.set(res, await this.accounts.changePassword(user, body.current, body.next));
  }

  private ip(req: Request) {
    return clientIp({ address: req.socket.remoteAddress ?? '', headers: req.headers }, this.config.trustProxyHops);
  }
}
