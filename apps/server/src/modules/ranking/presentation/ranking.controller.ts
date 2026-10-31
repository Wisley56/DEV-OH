import type { MatchHistoryEntry, RankingEntry } from '@devoh/protocol';
import { Controller, Get, Header, Inject, UseGuards } from '@nestjs/common';
import { Throttle } from '../../../common/security/throttle.js';
import type { UserRecord } from '../../accounts/application/ports.js';
import { AuthGuard, CurrentUser } from '../../accounts/presentation/auth.guard.js';
import { RANKING_REPOSITORY, type RankingRepository } from '../application/ports.js';

/** Quantas contas o ranking mostra e quantas partidas o histórico traz. */
const TOP = 100;
const HISTORY = 10;

@Controller('ranking')
export class RankingController {
  constructor(@Inject(RANKING_REPOSITORY) private readonly ranking: RankingRepository) {}

  /** Público: dá para ver o ranking sem conta. */
  @Get()
  @Throttle('list')
  @Header('cache-control', 'no-store')
  top(): Promise<RankingEntry[]> {
    return this.ranking.top(TOP);
  }

  @Get('me')
  @Throttle('list')
  @UseGuards(AuthGuard)
  @Header('cache-control', 'no-store')
  mine(@CurrentUser() user: UserRecord): Promise<MatchHistoryEntry[]> {
    return this.ranking.history(user.id, HISTORY);
  }
}
