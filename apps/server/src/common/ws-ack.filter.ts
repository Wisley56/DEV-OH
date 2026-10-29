import { Catch, Logger, type ArgumentsHost, type ExceptionFilter } from '@nestjs/common';
import type { Ack } from '@devoh/protocol';
import { DomainError } from './domain-error.js';

/**
 * Converte exceções dos handlers de socket em `{ ok: false, error }` no ack,
 * no mesmo formato que o cliente já espera.
 */
@Catch()
export class WsAckFilter implements ExceptionFilter {
  private readonly logger = new Logger('WsAckFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ack = host.getArgs().find((a): a is (r: Ack) => void => typeof a === 'function');
    let error = 'Erro interno no servidor.';
    if (exception instanceof DomainError) error = exception.message;
    else this.logger.error('Erro no handler de socket', exception instanceof Error ? exception.stack : String(exception));
    ack?.({ ok: false, error });
  }
}
