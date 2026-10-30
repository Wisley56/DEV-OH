import { hash, verify } from '@node-rs/argon2';
import { Injectable } from '@nestjs/common';
import type { PasswordHasher } from '../application/ports.js';

/** Argon2id com os parâmetros mínimos recomendados pela OWASP (19 MiB, 2 iterações). */
@Injectable()
export class Argon2Hasher implements PasswordHasher {
  hash(password: string) {
    return hash(password, { memoryCost: 19456, timeCost: 2, parallelism: 1 });
  }

  async verify(passwordHash: string, password: string) {
    try {
      return await verify(passwordHash, password);
    } catch {
      return false;
    }
  }
}
