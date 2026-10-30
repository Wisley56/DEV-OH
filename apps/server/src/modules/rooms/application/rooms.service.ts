import { validateDeck, type Seat } from '@devoh/engine';
import type { OpenRoom } from '@devoh/protocol';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { DomainError } from '../../../common/domain-error.js';
import { SecurityLog } from '../../../common/security/security-log.js';
import { AppConfig } from '../../../config/app-config.js';
import { Room, type Seatholder } from '../domain/room.js';
import {
  CLOCK,
  ID_GENERATOR,
  MATCH_RECORDER,
  ROOM_NOTIFIER,
  ROOM_REPOSITORY,
  SCHEDULER,
  type Clock,
  type IdGenerator,
  type MatchRecorder,
  type Player,
  type RoomNotifier,
  type RoomRepository,
  type Scheduler,
} from './ports.js';

const turnTask = (code: string) => `turn:${code}`;
const goneTask = (code: string, seat: number) => `gone:${code}:${seat}`;

/** Casos de uso do ciclo de vida das salas (criar, entrar, reconectar, sair, revanche, relógio). */
@Injectable()
export class RoomsService {
  private readonly logger = new Logger(RoomsService.name);

  constructor(
    @Inject(ROOM_REPOSITORY) private readonly rooms: RoomRepository,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ROOM_NOTIFIER) private readonly notifier: RoomNotifier,
    @Inject(AppConfig) private readonly config: AppConfig,
    @Inject(SecurityLog) private readonly security: SecurityLog,
    @Inject(SCHEDULER) private readonly scheduler: Scheduler,
    @Inject(MATCH_RECORDER) private readonly recorder: MatchRecorder,
  ) {}

  create(socketId: string, player: Player, deck: string[], isPrivate = false): { code: string } {
    this.checkDeck(deck);
    if (this.rooms.count() >= this.config.maxRooms) {
      this.security.warn('room-limit', undefined, { rooms: this.rooms.count() });
      throw new DomainError('Servidor lotado agora. Tenta de novo daqui a pouco.');
    }
    let code = this.ids.roomCode();
    while (this.rooms.has(code)) code = this.ids.roomCode();
    const room = new Room(code, this.seat(socketId, player, deck), this.clock.now(), isPrivate);
    this.rooms.save(room);
    this.publish(room);
    return { code };
  }

  join(socketId: string, code: string, player: Player, deck: string[]): { code: string } {
    const room = this.rooms.get(code.toUpperCase());
    if (!room) throw new DomainError('Sala não encontrada. Confere o código?');
    if (room.isFull) throw new DomainError('A sala já está cheia.');
    this.checkDeck(deck);
    room.join(this.seat(socketId, player, deck));
    this.publish(room);
    return { code: room.code };
  }

  /** Volta para o assento da própria conta (caiu, recarregou a página ou abriu em outra aba). */
  rejoin(socketId: string, code: string, userId: string): { code: string } {
    const room = this.rooms.get(code.toUpperCase());
    const p = room?.seatholderByUser(userId);
    if (!room || !p) throw new DomainError('Essa sala não existe mais.');
    room.reconnect(p, socketId);
    this.publish(room);
    return { code: room.code };
  }

  /** Salas públicas esperando oponente, das mais antigas para as mais novas. */
  listOpen(): OpenRoom[] {
    const now = this.clock.now();
    return [...this.rooms.all()]
      .filter((r) => !r.isPrivate && !r.isFull && !!r.players[0].socketId)
      .sort((a, b) => a.createdAt - b.createdAt)
      .slice(0, 30)
      .map((r) => ({ code: r.code, host: r.players[0].name, waitingMs: now - r.createdAt }));
  }

  /** Sala onde o socket está sentado, com o assento. */
  locate(code: string | undefined, socketId: string) {
    const room = code ? this.rooms.get(code) : undefined;
    const seat = room?.seatOfSocket(socketId) ?? null;
    return { room, seat };
  }

  rematch(code: string | undefined, socketId: string) {
    const { room, seat } = this.locate(code, socketId);
    if (!room || seat === null || !room.game || room.game.winner === null) return;
    room.requestRematch(seat);
    this.publish(room);
  }

  leave(code: string | undefined, socketId: string) {
    const room = code ? this.rooms.get(code) : undefined;
    if (!room) return;
    room.release(socketId, this.clock.now(), this.config.reconnectTimeoutMs);
    if (!room.game) this.remove(room);
    else this.publish(room);
  }

  disconnect(code: string | undefined, socketId: string) {
    const room = code ? this.rooms.get(code) : undefined;
    if (!room) return;
    room.release(socketId, this.clock.now(), this.config.reconnectTimeoutMs);
    this.publish(room);
  }

  /** Atualiza o "visto por último", acerta os relógios e avisa os jogadores. */
  publish(room: Room) {
    room.touched = this.clock.now();
    this.armTimers(room);
    if (room.needsRecord) void this.record(room);
    this.notifier.publish(room);
  }

  /** Remove salas paradas; retorna quantas saíram. */
  sweep(ttlMs: number, idleTtlMs: number): number {
    const now = this.clock.now();
    let removed = 0;
    for (const room of [...this.rooms.all()]) {
      if (room.isStale(now, ttlMs, idleTtlMs)) {
        this.remove(room);
        removed++;
      }
    }
    return removed;
  }

  count() {
    return this.rooms.count();
  }

  /** Turno novo arma o prazo; quem caiu no meio do duelo tem o prazo de volta. */
  private armTimers(room: Room) {
    const { code } = room;
    if (room.syncTurn(this.clock.now(), this.config.turnTimeoutMs)) {
      const key = room.turnKey;
      this.scheduler.schedule(turnTask(code), room.turnDeadline!, () => this.onTurnTimeout(code, key));
    } else if (room.turnDeadline === null) this.scheduler.cancel(turnTask(code));

    room.players.forEach((p, seat) => {
      if (p?.reconnectDeadline) this.scheduler.schedule(goneTask(code, seat), p.reconnectDeadline, () => this.onGone(code, seat as Seat));
      else this.scheduler.cancel(goneTask(code, seat));
    });
  }

  private onTurnTimeout(code: string, key: string | null) {
    const room = this.rooms.get(code);
    if (!room || room.turnKey !== key) return;
    room.expireTurn();
    this.publish(room);
  }

  private onGone(code: string, seat: Seat) {
    const room = this.rooms.get(code);
    if (!room) return;
    room.expireReconnect(seat);
    this.publish(room);
  }

  /**
   * Fim de partida (vitória, empate, W.O., tempo): vai uma vez só para o ranking. Erro no
   * banco não derruba a sala: o duelo já acabou, fica só no log.
   */
  private async record(room: Room) {
    const g = room.game!;
    const matchId = room.matchId!;
    room.recorded = true;
    try {
      const delta = await this.recorder.record({
        matchId,
        users: [room.players[0].userId, room.players[1]!.userId],
        winner: g.winner === 'draw' ? null : g.winner,
        reason: g.outcome?.reason ?? 'lp',
        turns: g.turn,
      });
      // Pode ter começado a revanche enquanto gravava: aí o delta é de outra partida.
      if (room.matchId !== matchId || !this.rooms.has(room.code)) return;
      room.eloDelta = delta;
      this.notifier.publish(room);
    } catch (err) {
      this.logger.error(`Não gravei a partida ${matchId}: ${(err as Error).message}`);
    }
  }

  private remove(room: Room) {
    this.rooms.delete(room.code);
    this.scheduler.cancel(turnTask(room.code));
    [0, 1].forEach((seat) => this.scheduler.cancel(goneTask(room.code, seat)));
  }

  private seat(socketId: string, player: Player, deck: string[]): Seatholder {
    return { userId: player.userId, name: player.name, deck, socketId, reconnectDeadline: null };
  }

  private checkDeck(deck: string[]) {
    const err = validateDeck(deck)[0];
    if (err) throw new DomainError(err);
  }
}
