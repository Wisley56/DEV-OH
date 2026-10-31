import { EVENTS } from '@devoh/protocol';
import { Inject, Injectable } from '@nestjs/common';
import type { Server } from 'socket.io';
import { CLOCK, type Clock } from '../../rooms/application/ports.js';
import type { TournamentNotifier } from '../application/ports.js';
import { tournamentStateFor } from '../application/tournament-state.js';
import type { Tournament } from '../domain/tournament.js';

/** Emite `tournament:state` para cada inscrito conectado. */
@Injectable()
export class SocketTournamentNotifier implements TournamentNotifier {
  private server: Server | null = null;

  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  attach(server: Server) {
    this.server = server;
  }

  publish(t: Tournament) {
    for (const e of t.entrants) {
      if (e.socketId) this.server?.to(e.socketId).emit(EVENTS.tournamentState, tournamentStateFor(t, e.userId, this.clock.now()));
    }
  }
}
