import { Inject, Injectable } from '@nestjs/common';
import type { Response } from 'express';
import { AppConfig } from '../../../config/app-config.js';

/**
 * Cookie da sessão: HttpOnly (o JavaScript do site nunca vê o token), SameSite=Strict e,
 * em produção, Secure com o prefixo __Host- (só HTTPS, sem Domain, Path=/).
 */
@Injectable()
export class SessionCookie {
  constructor(@Inject(AppConfig) private readonly config: AppConfig) {}

  get name() {
    return this.config.production ? '__Host-devoh_session' : 'devoh_session';
  }

  /** Token do cookie no cabeçalho `Cookie` (HTTP ou handshake do Socket.IO). */
  read(header: string | undefined): string | undefined {
    if (!header) return undefined;
    for (const part of header.split(';')) {
      const eq = part.indexOf('=');
      if (eq < 0 || part.slice(0, eq).trim() !== this.name) continue;
      const value = part.slice(eq + 1).trim();
      return /^[\w-]{1,128}$/.test(value) ? value : undefined;
    }
    return undefined;
  }

  set(res: Response, token: string) {
    res.cookie(this.name, token, { ...this.options(), maxAge: this.config.sessionTtlMs });
  }

  clear(res: Response) {
    res.clearCookie(this.name, this.options());
  }

  private options() {
    return { httpOnly: true, secure: this.config.production, sameSite: 'strict' as const, path: '/' };
  }
}
