import { validateDeck } from '@devoh/engine';
import { TOURNAMENT_MAX, TOURNAMENT_PREFIX, type OpenRoom } from '@devoh/protocol';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { DomainError } from '../../../common/domain-error.js';
import { SecurityLog } from '../../../common/security/security-log.js';
import { AppConfig } from '../../../config/app-config.js';
import { CLOCK, ID_GENERATOR, type Clock, type IdGenerator, type Player, type TournamentWatcher } from '../../rooms/application/ports.js';
import { RoomsService } from '../../rooms/application/rooms.service.js';
import type { Room } from '../../rooms/domain/room.js';
import { Tournament, type Entrant } from '../domain/tournament.js';
import { TOURNAMENT_NOTIFIER, TOURNAMENT_REPOSITORY, type TournamentNotifier, type TournamentRepository } from './ports.js';

/**
 * Casos de uso do torneio (criar, entrar, iniciar, sair, reconectar). Cada duelo é uma sala
 * 1v1 comum, criada aqui; o serviço de salas avisa de cada mudança e do fim de cada uma.
 */
@Injectable()
export class TournamentsService implements TournamentWatcher {
  private readonly logger = new Logger(TournamentsService.name);

  constructor(
    @Inject(TOURNAMENT_REPOSITORY) private readonly tournaments: TournamentRepository,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(TOURNAMENT_NOTIFIER) private readonly notifier: TournamentNotifier,
    @Inject(RoomsService) private readonly rooms: RoomsService,
    @Inject(AppConfig) private readonly config: AppConfig,
    @Inject(SecurityLog) private readonly security: SecurityLog,
  ) {
    rooms.watch(this);
  }

  create(socketId: string, player: Player, deck: string[], isPrivate = false): { code: string } {
    this.checkDeck(deck);
    if (this.tournaments.count() >= this.config.maxRooms) {
      this.security.warn('room-limit', undefined, { tournaments: this.tournaments.count() });
      throw new DomainError('Servidor lotado agora. Tenta de novo daqui a pouco.');
    }
    let code = TOURNAMENT_PREFIX + this.ids.roomCode();
    while (this.tournaments.has(code)) code = TOURNAMENT_PREFIX + this.ids.roomCode();
    const t = new Tournament(code, { ...player, deck, socketId }, this.clock.now(), isPrivate);
    this.tournaments.save(t);
    this.publish(t);
    return { code };
  }

  join(socketId: string, code: string, player: Player, deck: string[]): { code: string } {
    const t = this.find(code);
    if (t.entrant(player.userId)) return this.rejoin(socketId, code, player.userId);
    this.checkDeck(deck);
    t.join({ ...player, deck, socketId });
    this.publish(t);
    return { code: t.code };
  }

  /** Volta para o torneio pela conta e, se houver, para o duelo em andamento. */
  rejoin(socketId: string, code: string, userId: string): { code: string } {
    const t = this.tournaments.get(code.toUpperCase());
    const e = t?.entrant(userId);
    if (!t || !e) throw new DomainError('Esse torneio não existe mais.');
    e.socketId = socketId;
    const m = t.activeMatch(userId);
    if (m?.roomCode && this.rooms.get(m.roomCode)) this.rooms.rejoin(socketId, m.roomCode, userId);
    this.publish(t);
    return { code: t.code };
  }

  start(code: string | undefined, socketId: string) {
    const t = code ? this.tournaments.get(code) : undefined;
    const e = t?.entrantBySocket(socketId);
    if (!t || !e) throw new DomainError('Você não está nesse torneio.');
    t.start(e.userId);
    this.launch(t);
    this.publish(t);
  }

  /** Sai de vez: na inscrição libera a vaga; com o torneio rolando, o que falta vira W.O. */
  leave(code: string | undefined, socketId: string) {
    const t = code ? this.tournaments.get(code) : undefined;
    const e = t?.entrantBySocket(socketId);
    if (!t || !e) return;
    const playing = t.leave(e.userId);
    if (!t.started && t.entrants.length === 0) return this.remove(t);
    if (playing?.roomCode) this.rooms.concede(playing.roomCode, e.userId);
    this.launch(t);
    this.publish(t);
  }

  disconnect(code: string | undefined, socketId: string) {
    const t = code ? this.tournaments.get(code) : undefined;
    const e = t?.entrantBySocket(socketId);
    if (!t || !e) return;
    e.socketId = null;
    const m = t.activeMatch(e.userId);
    if (m?.roomCode) this.rooms.disconnect(m.roomCode, socketId);
    this.publish(t);
  }

  /** Sala do duelo em andamento do socket, para as jogadas chegarem ao lugar certo. */
  matchCodeFor(code: string | undefined, socketId: string): string | undefined {
    const t = code ? this.tournaments.get(code) : undefined;
    const e = t?.entrantBySocket(socketId);
    return (e && t?.activeMatch(e.userId)?.roomCode) ?? undefined;
  }

  // ── Avisos do serviço de salas ──

  matchUpdated(room: Room) {
    const ref = room.tournament!;
    const t = this.tournaments.get(ref.code);
    const m = t?.matches.find((x) => x.id === ref.matchId);
    const g = room.game;
    if (!t || !m || m.status !== 'jogando' || !g) return;
    const lp: [number, number] = [g.players[0].lp, g.players[1].lp];
    if (g.winner !== null) {
      t.report(m.id, g.winner === 'draw' ? null : g.winner, lp);
      this.launch(t);
    } else if (m.lp?.[0] === lp[0] && m.lp[1] === lp[1]) return;
    else m.lp = lp;
    this.publish(t);
  }

  /** A sala sumiu sem resultado (os dois sumiram): conta como empate. */
  matchRemoved(room: Room) {
    const ref = room.tournament!;
    const t = this.tournaments.get(ref.code);
    const m = t?.matches.find((x) => x.id === ref.matchId);
    if (!t || m?.status !== 'jogando') return;
    t.report(m.id, null, m.lp ?? [0, 0]);
    this.launch(t);
    this.publish(t);
  }

  listOpen(now: number): OpenRoom[] {
    return [...this.tournaments.all()]
      .filter((t) => !t.isPrivate && !t.started && !t.isFull && !!t.host?.socketId)
      .map((t) => ({
        code: t.code,
        host: t.host!.name,
        waitingMs: now - t.createdAt,
        mode: 'torneio',
        players: t.entrants.length,
        max: TOURNAMENT_MAX,
      }));
  }

  /** Remove torneios vencidos ou abandonados; tenta de novo os duelos que não abriram (servidor lotado). */
  sweep(ttlMs: number, idleTtlMs: number): number {
    const now = this.clock.now();
    let removed = 0;
    for (const t of [...this.tournaments.all()]) {
      if (t.isStale(now, ttlMs, idleTtlMs)) {
        this.remove(t);
        removed++;
      } else if (t.pending().length) {
        this.launch(t);
        this.publish(t);
      }
    }
    return removed;
  }

  publish(t: Tournament) {
    t.touched = this.clock.now();
    this.notifier.publish(t);
  }

  /** Abre uma sala para cada duelo pendente. */
  private launch(t: Tournament) {
    for (const m of t.pending()) {
      const a = t.entrant(m.a)!;
      const b = t.entrant(m.b!)!;
      try {
        const roomCode = this.rooms.createMatch({ code: t.code, matchId: m.id }, this.matchSeat(a), this.matchSeat(b));
        t.begin(m.id, roomCode);
      } catch (err) {
        this.logger.warn(`Duelo ${m.id} do torneio ${t.code} não abriu: ${(err as Error).message}`);
        return;
      }
    }
  }

  private matchSeat(e: Entrant) {
    return { player: { userId: e.userId, name: e.name }, socketId: e.socketId, deck: e.deck };
  }

  private remove(t: Tournament) {
    this.tournaments.delete(t.code);
    for (const m of t.matches) if (m.roomCode) this.rooms.close(m.roomCode);
  }

  private find(code: string) {
    const t = this.tournaments.get(code.toUpperCase());
    if (!t) throw new DomainError('Torneio não encontrado. Confere o código?');
    return t;
  }

  private checkDeck(deck: string[]) {
    const err = validateDeck(deck)[0];
    if (err) throw new DomainError(err);
  }
}
