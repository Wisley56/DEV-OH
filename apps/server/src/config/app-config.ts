import { z } from 'zod';

const EnvSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  /** Lista separada por vírgula; "*" libera tudo (padrão em dev). */
  CORS_ORIGIN: z.string().default('*'),
  /** Sala sem atividade por esse tempo é removida. */
  ROOM_TTL_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(2 * 60 * 60 * 1000),
  /** Sala sem ninguém conectado por esse tempo é removida. */
  ROOM_IDLE_TTL_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(10 * 60 * 1000),
});

/** Configuração do servidor, validada a partir das variáveis de ambiente. */
export class AppConfig {
  readonly port: number;
  readonly corsOrigins: string[];
  readonly roomTtlMs: number;
  readonly roomIdleTtlMs: number;

  constructor(env: Record<string, string | undefined> = process.env) {
    const parsed = EnvSchema.safeParse(env);
    if (!parsed.success) throw new Error(`Variáveis de ambiente inválidas: ${parsed.error.message}`);
    const e = parsed.data;
    this.port = e.PORT;
    this.corsOrigins = e.CORS_ORIGIN.split(',').map((s) => s.trim());
    this.roomTtlMs = e.ROOM_TTL_MS;
    this.roomIdleTtlMs = e.ROOM_IDLE_TTL_MS;
  }

  /** Valor para a opção `cors.origin` do Socket.IO. */
  get corsOrigin(): true | string[] {
    return this.corsOrigins.includes('*') ? true : this.corsOrigins;
  }
}
