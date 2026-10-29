import type { PipeTransform } from '@nestjs/common';
import type { z } from 'zod';
import { DomainError } from './domain-error.js';

/** Valida o payload de um evento com um schema do @devoh/protocol. */
export class ZodValidationPipe<S extends z.ZodType> implements PipeTransform<unknown, z.infer<S>> {
  constructor(
    private readonly schema: S,
    private readonly message = 'Payload inválido.',
  ) {}

  transform(value: unknown): z.infer<S> {
    const r = this.schema.safeParse(value);
    if (!r.success) throw new DomainError(this.message);
    return r.data;
  }
}
