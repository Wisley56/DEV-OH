import type { MatchHistoryEntry, RankingEntry } from '@devoh/protocol';

export interface RankingRepository {
  /** Contas com pelo menos uma partida, por Elo e depois vitórias. */
  top(limit: number): Promise<RankingEntry[]>;
  /** Últimas partidas da conta, da mais nova para a mais velha. */
  history(userId: string, limit: number): Promise<MatchHistoryEntry[]>;
}

export const RANKING_REPOSITORY = Symbol('RankingRepository');
