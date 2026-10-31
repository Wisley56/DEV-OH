import type { Tournament } from '../domain/tournament.js';

/** Portas da aplicação de torneios: implementadas na infraestrutura/apresentação. */

export interface TournamentRepository {
  get(code: string): Tournament | undefined;
  has(code: string): boolean;
  save(t: Tournament): void;
  delete(code: string): void;
  all(): Iterable<Tournament>;
  count(): number;
}

/** Envia a cada inscrito conectado o estado atual do torneio. */
export interface TournamentNotifier {
  publish(t: Tournament): void;
}

export const TOURNAMENT_REPOSITORY = Symbol('TournamentRepository');
export const TOURNAMENT_NOTIFIER = Symbol('TournamentNotifier');

/** Um torneio vive no máximo 4 h (as salas, 2 h): dá para 10 pessoas jogarem todas as fases. */
export const TOURNAMENT_TTL_MS = 4 * 60 * 60 * 1000;
