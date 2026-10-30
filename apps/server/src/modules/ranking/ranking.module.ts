import { Global, Module } from '@nestjs/common';
import { MATCH_RECORDER } from '../rooms/application/ports.js';
import { RANKING_REPOSITORY } from './application/ports.js';
import { DrizzleMatchRecorder } from './infrastructure/drizzle-match.recorder.js';
import { DrizzleRankingRepository } from './infrastructure/drizzle-ranking.repository.js';
import { RankingController } from './presentation/ranking.controller.js';

/** Ranking: global porque as salas gravam o resultado pelo MATCH_RECORDER. */
@Global()
@Module({
  controllers: [RankingController],
  providers: [
    { provide: MATCH_RECORDER, useClass: DrizzleMatchRecorder },
    { provide: RANKING_REPOSITORY, useClass: DrizzleRankingRepository },
  ],
  exports: [MATCH_RECORDER],
})
export class RankingModule {}
