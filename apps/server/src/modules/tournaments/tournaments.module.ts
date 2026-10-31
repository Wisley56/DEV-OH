import { Module } from '@nestjs/common';
import { RoomsModule } from '../rooms/rooms.module.js';
import { TOURNAMENT_NOTIFIER, TOURNAMENT_REPOSITORY } from './application/ports.js';
import { TournamentsService } from './application/tournaments.service.js';
import { InMemoryTournamentRepository } from './infrastructure/in-memory-tournament.repository.js';
import { TournamentJanitor } from './infrastructure/tournament-janitor.js';
import { SocketTournamentNotifier } from './presentation/socket-tournament.notifier.js';
import { TournamentsGateway } from './presentation/tournaments.gateway.js';

@Module({
  imports: [RoomsModule],
  providers: [
    TournamentsService,
    TournamentsGateway,
    TournamentJanitor,
    SocketTournamentNotifier,
    { provide: TOURNAMENT_REPOSITORY, useClass: InMemoryTournamentRepository },
    { provide: TOURNAMENT_NOTIFIER, useExisting: SocketTournamentNotifier },
  ],
  exports: [TournamentsService],
})
export class TournamentsModule {}
