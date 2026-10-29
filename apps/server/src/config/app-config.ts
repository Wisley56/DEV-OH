import { z } from 'zod';

const int = (fallback: number) => z.coerce.number().int().positive().default(fallback);

const EnvSchema = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: int(3001),
  /** Lista separada por vírgula; "*" libera tudo (só permitido fora de produção). */
  CORS_ORIGIN: z.string().optional(),
  /** Atrás de proxy (Railway): o IP real vem do `x-forwarded-for`. */
  TRUST_PROXY: z.enum(['true', 'false']).default('false'),
  /** Sala sem atividade por esse tempo é removida. */
  ROOM_TTL_MS: int(2 * 60 * 60 * 1000),
  /** Sala sem ninguém conectado por esse tempo é removida. */
  ROOM_IDLE_TTL_MS: int(10 * 60 * 1000),
  /** Teto de salas abertas no servidor. */
  MAX_ROOMS: int(1000),
  /** Conexões simultâneas por IP. */
  MAX_CONN_PER_IP: int(20),
  /** Salas criadas por minuto, por IP. */
  RATE_CREATE_PER_MIN: int(5),
  /** Tentativas de entrar/reconectar por minuto, por IP (barra força bruta de código). */
  RATE_JOIN_PER_MIN: int(10),
  /** Jogadas por segundo, por conexão (a rajada aceita o triplo). */
  RATE_ACTION_PER_SEC: int(10),
});

/** Regra de um balde de tokens: até `capacity` de rajada, recarregando `perSec` por segundo. */
export interface RateRule {
  capacity: number;
  perSec: number;
}

export type RateBucket = 'create' | 'join' | 'action' | 'room' | 'strikes';

/** Configuração do servidor, validada a partir das variáveis de ambiente. */
export class AppConfig {
  readonly production: boolean;
  readonly port: number;
  readonly corsOrigins: string[];
  readonly trustProxy: boolean;
  readonly roomTtlMs: number;
  readonly roomIdleTtlMs: number;
  readonly maxRooms: number;
  readonly maxConnPerIp: number;
  readonly rates: Record<RateBucket, RateRule>;

  constructor(env: Record<string, string | undefined> = process.env) {
    const parsed = EnvSchema.safeParse(env);
    if (!parsed.success) throw new Error(`Variáveis de ambiente inválidas: ${parsed.error.message}`);
    const e = parsed.data;
    this.production = e.NODE_ENV === 'production';
    this.port = e.PORT;
    this.corsOrigins = (e.CORS_ORIGIN ?? '*')
      .split(',')
      .map((s) => s.trim().replace(/\/$/, ''))
      .filter(Boolean);
    if (this.production && (!e.CORS_ORIGIN || this.corsOrigins.includes('*'))) {
      throw new Error('Em produção, defina CORS_ORIGIN com a URL do web (sem "*").');
    }
    this.trustProxy = e.TRUST_PROXY === 'true';
    this.roomTtlMs = e.ROOM_TTL_MS;
    this.roomIdleTtlMs = e.ROOM_IDLE_TTL_MS;
    this.maxRooms = e.MAX_ROOMS;
    this.maxConnPerIp = e.MAX_CONN_PER_IP;
    this.rates = {
      create: { capacity: e.RATE_CREATE_PER_MIN, perSec: e.RATE_CREATE_PER_MIN / 60 },
      join: { capacity: e.RATE_JOIN_PER_MIN, perSec: e.RATE_JOIN_PER_MIN / 60 },
      action: { capacity: e.RATE_ACTION_PER_SEC * 3, perSec: e.RATE_ACTION_PER_SEC },
      room: { capacity: 5, perSec: 5 },
      /** Pedidos barrados: ao esgotar, a conexão é derrubada. */
      strikes: { capacity: 10, perSec: 0.1 },
    };
  }

  /** Valor para a opção `cors.origin`: `true` libera tudo. */
  get corsOrigin(): true | string[] {
    return this.corsOrigins.includes('*') ? true : this.corsOrigins;
  }

  /** O `Origin` do handshake é aceito? Sem lista ("*"), aceita qualquer um. */
  allowsOrigin(origin: string | undefined) {
    const allowed = this.corsOrigin;
    return allowed === true || (!!origin && allowed.includes(origin.replace(/\/$/, '')));
  }
}
