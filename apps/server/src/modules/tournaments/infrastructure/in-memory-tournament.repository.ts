import { Injectable } from '@nestjs/common';
import type { TournamentRepository } from '../application/ports.js';
import type { Tournament } from '../domain/tournament.js';

/** Torneios em memória, como as salas (somem se o servidor reiniciar). */
@Injectable()
export class InMemoryTournamentRepository implements TournamentRepository {
  private readonly tournaments = new Map<string, Tournament>();

  get(code: string) {
    return this.tournaments.get(code);
  }
  has(code: string) {
    return this.tournaments.has(code);
  }
  save(t: Tournament) {
    this.tournaments.set(t.code, t);
  }
  delete(code: string) {
    this.tournaments.delete(code);
  }
  all() {
    return this.tournaments.values();
  }
  count() {
    return this.tournaments.size;
  }
}
