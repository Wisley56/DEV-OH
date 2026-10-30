import { Inject, Injectable, Logger } from '@nestjs/common';
import { AppConfig, TURNSTILE_TEST_KEYS } from '../../../config/app-config.js';
import type { HumanVerifier } from '../application/ports.js';

const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/**
 * Confere o token do widget Cloudflare Turnstile no servidor da Cloudflare (o token vale
 * uma vez só e por poucos minutos). Com a chave secreta de teste (dev e testes), aceita
 * qualquer token sem sair para a rede.
 */
@Injectable()
export class TurnstileVerifier implements HumanVerifier {
  private readonly logger = new Logger('Turnstile');

  constructor(@Inject(AppConfig) private readonly config: AppConfig) {}

  async verify(token: string, ip: string): Promise<boolean> {
    const secret = this.config.turnstile.secretKey;
    if (secret === TURNSTILE_TEST_KEYS.secret) return token.length > 0;
    try {
      const res = await fetch(SITEVERIFY, {
        method: 'POST',
        body: new URLSearchParams({ secret, response: token, remoteip: ip }),
        signal: AbortSignal.timeout(8000),
      });
      const body = (await res.json()) as { success?: boolean; 'error-codes'?: string[] };
      if (!body.success) this.logger.warn({ msg: 'turnstile recusou', codes: body['error-codes'] });
      return body.success === true;
    } catch (err) {
      this.logger.error('Falha ao falar com o Turnstile', err instanceof Error ? err.message : String(err));
      return false;
    }
  }
}
