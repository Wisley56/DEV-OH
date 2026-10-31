import type { PipeTransform } from '@nestjs/common';
import type { z } from 'zod';
import { DomainError } from './domain-error.js';

/**
 * Valida o payload de um evento ou corpo HTTP com um schema do @devoh/protocol.
 * Sem `message`, usa a mensagem do primeiro problema (os schemas de conta e deck
 * trazem mensagens em português para o jogador).
 */
export class ZodValidationPipe<S extends z.ZodType> implements PipeTransform<unknown, z.infer<S>> {
  constructor(
    private readonly schema: S,
    private readonly message?: string,
  ) {}

  transform(value: unknown): z.infer<S> {
    const r = this.schema.safeParse(value);
    if (!r.success) throw new DomainError(this.message ?? r.error.issues[0]?.message ?? 'Payload inválido.');
    return r.data;
  }
}
