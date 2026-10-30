import { z } from 'zod';

const int = (fallback: number) => z.coerce.number().int().positive().default(fallback);

/** Chaves de teste públicas do Cloudflare Turnstile: o widget e a verificação sempre passam. */
export const TURNSTILE_TEST_KEYS = { site: '1x00000000000000000000AA', secret: '1x0000000000000000000000000000000AA' };

/**
 * Obrigatórias em produção (configuradas no Railway), sem valor padrão: faltou uma,
 * o servidor nem sobe. Fora de produção, os padrões de `devDefaults`.
 */
const PRODUCTION_REQUIRED = [
  'DATABASE_URL',
  'DB_POOL_MAX',
  'SESSION_TTL_DAYS',
  'TRUST_PROXY_HOPS',
  'TURNSTILE_SITE_KEY',
  'TURNSTILE_SECRET_KEY',
] as const;

const EnvSchema = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: int(3001),
  /** Lista separada por vírgula; "*" libera tudo (só permitido fora de produção). */
  CORS_ORIGIN: z.string().optional(),
  /**
   * Proxies confiáveis na frente do servidor (borda do Railway + proxy do web = 2).
   * O IP do cliente é o item do `x-forwarded-for` que eles acrescentaram; 0 = usa o IP da conexão.
   */
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).optional(),
  /** postgres://… em produção. Fora dela, `pglite://memory` ou `pglite://<pasta>` (Postgres embutido). */
  DATABASE_URL: z.string().optional(),
  /** Conexões abertas com o Postgres. */
  DB_POOL_MAX: z.coerce.number().int().positive().max(100).optional(),
  /** Validade da sessão (renovada a cada uso). */
  SESSION_TTL_DAYS: z.coerce.number().int().positive().max(365).optional(),
  TURNSTILE_SITE_KEY: z.string().optional(),
  TURNSTILE_SECRET_KEY: z.string().optional(),
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
  /** Logins e cadastros por minuto, por IP. */
  RATE_AUTH_PER_MIN: int(10),
  /** Tempo de cada turno no online; estourou, o turno passa sozinho. */
  TURN_TIMEOUT_MS: int(90 * 1000),
  /** Quem cai no meio do duelo tem esse tempo para voltar; depois, perde por W.O. */
  RECONNECT_TIMEOUT_MS: int(60 * 1000),
});

/** Regra de um balde de tokens: até `capacity` de rajada, recarregando `perSec` por segundo. */
export interface RateRule {
  capacity: number;
  perSec: number;
}

export type RateBucket = 'create' | 'join' | 'action' | 'room' | 'list' | 'strikes' | 'auth' | 'decks';

/** Configuração do servidor, validada a partir das variáveis de ambiente. */
export class AppConfig {
  readonly production: boolean;
  readonly port: number;
  readonly corsOrigins: string[];
  readonly trustProxyHops: number;
  readonly databaseUrl: string;
  readonly dbPoolMax: number;
  readonly sessionTtlMs: number;
  readonly turnstile: { siteKey: string; secretKey: string };
  readonly roomTtlMs: number;
  readonly roomIdleTtlMs: number;
  readonly maxRooms: number;
  readonly maxConnPerIp: number;
  readonly turnTimeoutMs: number;
  readonly reconnectTimeoutMs: number;
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
    if (this.production) {
      const missing = PRODUCTION_REQUIRED.filter((k) => e[k] === undefined || e[k] === '');
      if (missing.length) throw new Error(`Em produção, defina no Railway: ${missing.join(', ')}.`);
      if (!/^postgres(ql)?:\/\//.test(e.DATABASE_URL!)) throw new Error('Em produção, DATABASE_URL deve ser postgres://…');
    }
    const dev = devDefaults(e.NODE_ENV);
    this.trustProxyHops = e.TRUST_PROXY_HOPS ?? dev.trustProxyHops;
    this.databaseUrl = e.DATABASE_URL || dev.databaseUrl;
    this.dbPoolMax = e.DB_POOL_MAX ?? dev.dbPoolMax;
    this.sessionTtlMs = (e.SESSION_TTL_DAYS ?? dev.sessionTtlDays) * 24 * 60 * 60 * 1000;
    this.turnstile = {
      siteKey: e.TURNSTILE_SITE_KEY || TURNSTILE_TEST_KEYS.site,
      secretKey: e.TURNSTILE_SECRET_KEY || TURNSTILE_TEST_KEYS.secret,
    };
    this.roomTtlMs = e.ROOM_TTL_MS;
    this.roomIdleTtlMs = e.ROOM_IDLE_TTL_MS;
    this.maxRooms = e.MAX_ROOMS;
    this.maxConnPerIp = e.MAX_CONN_PER_IP;
    this.turnTimeoutMs = e.TURN_TIMEOUT_MS;
    this.reconnectTimeoutMs = e.RECONNECT_TIMEOUT_MS;
    this.rates = {
      create: { capacity: e.RATE_CREATE_PER_MIN, perSec: e.RATE_CREATE_PER_MIN / 60 },
      join: { capacity: e.RATE_JOIN_PER_MIN, perSec: e.RATE_JOIN_PER_MIN / 60 },
      action: { capacity: e.RATE_ACTION_PER_SEC * 3, perSec: e.RATE_ACTION_PER_SEC },
      room: { capacity: 5, perSec: 5 },
      /** Lista de salas do lobby e ranking (atualiza a cada poucos segundos). */
      list: { capacity: 20, perSec: 1 },
      /** Pedidos barrados: ao esgotar, a conexão é derrubada. */
      strikes: { capacity: 10, perSec: 0.1 },
      /** Login e cadastro: barra força bruta de senha. */
      auth: { capacity: e.RATE_AUTH_PER_MIN, perSec: e.RATE_AUTH_PER_MIN / 60 },
      /** Salvar/apagar decks. */
      decks: { capacity: 30, perSec: 1 },
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

/** Padrões fora de produção: Postgres embutido (em memória nos testes), sem proxy, chaves de teste. */
function devDefaults(nodeEnv: string) {
  return {
    trustProxyHops: 0,
    databaseUrl: nodeEnv === 'test' ? 'pglite://memory' : 'pglite://.data/dev',
    dbPoolMax: 10,
    sessionTtlDays: 30,
  };
}
