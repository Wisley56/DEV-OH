/**
 * Contrato HTTP de contas, decks e ranking (rotas em /api, mesma origem do site).
 * A sessão vai num cookie HttpOnly: nenhum destes tipos carrega token.
 */

/** Usuário de login: minúsculas, números e "_" (o servidor converte para minúsculas). */
export const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;
export const PASSWORD_MIN = 8;
/** Teto para o hash não virar ataque de negação de serviço. */
export const PASSWORD_MAX = 128;
/** Decks guardados por conta. */
export const MAX_DECKS = 30;

/** A conta logada, como o próprio dono a vê. */
export interface AccountView {
  username: string;
  displayName: string;
  elo: number;
  wins: number;
  losses: number;
  draws: number;
}

export interface RegisterPayload {
  username: string;
  displayName: string;
  password: string;
  /** Resposta do widget anti-robô (Cloudflare Turnstile). */
  turnstileToken: string;
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface ChangePasswordPayload {
  current: string;
  next: string;
}

/** Configuração pública que o web lê antes do cadastro. */
export interface AuthConfig {
  turnstileSiteKey: string;
}

/** Deck salvo na conta (mesmo formato do DeckList do engine). */
export interface DeckPayload {
  id: string;
  name: string;
  description: string;
  cards: string[];
}

export interface RankingEntry {
  position: number;
  username: string;
  displayName: string;
  elo: number;
  wins: number;
  losses: number;
  draws: number;
  played: number;
  /** 0–100, arredondado; null sem partidas. */
  winRate: number | null;
}

export interface MatchHistoryEntry {
  id: string;
  /** ISO 8601. */
  playedAt: string;
  opponent: string;
  result: 'win' | 'loss' | 'draw';
  reason: string;
  eloDelta: number;
}

/** Erro das rotas HTTP: o corpo traz a mensagem para mostrar ao jogador. */
export interface ApiError {
  statusCode: number;
  message: string;
}
