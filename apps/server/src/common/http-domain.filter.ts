import { Catch, type ArgumentsHost, type ExceptionFilter } from '@nestjs/common';
import type { ApiError } from '@devoh/protocol';
import type { Response } from 'express';
import { DomainError } from './domain-error.js';

/** Converte regra de negócio quebrada nas rotas HTTP em `{ statusCode, message }`, como os erros do Nest. */
@Catch(DomainError)
export class HttpDomainFilter implements ExceptionFilter {
  catch(exception: DomainError, host: ArgumentsHost) {
    if (host.getType() !== 'http') throw exception;
    const res = host.switchToHttp().getResponse<Response>();
    const body: ApiError = { statusCode: exception.status, message: exception.message };
    res.status(exception.status).json(body);
  }
}
