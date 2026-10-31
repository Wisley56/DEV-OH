import { Inject, Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { AppConfig } from '../../../config/app-config.js';
import { TOURNAMENT_TTL_MS } from '../application/ports.js';
import { TournamentsService } from '../application/tournaments.service.js';

/** Limpa torneios parados a cada minuto. */
@Injectable()
export class TournamentJanitor implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;

  constructor(
    @Inject(TournamentsService) private readonly tournaments: TournamentsService,
    @Inject(AppConfig) private readonly config: AppConfig,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => this.tournaments.sweep(TOURNAMENT_TTL_MS, this.config.roomIdleTtlMs), 60 * 1000);
    this.timer.unref();
  }

  onModuleDestroy() {
    clearInterval(this.timer);
  }
}
