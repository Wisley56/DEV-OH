import { createGame, type GameState, type Seat } from '@devoh/engine';
import { timingSafeEqual } from 'node:crypto';
import { DomainError } from '../../../common/domain-error.js';

export interface Seatholder {
  name: string;
  deck: string[];
  token: string;
  /** null = desconectado (pode voltar pelo token). */
  socketId: string | null;
}

function sameToken(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Sala de duelo: dois assentos, o estado do jogo e os pedidos de revanche. */
export class Room {
  readonly players: [Seatholder, Seatholder | null];
  game: GameState | null = null;
  rematch: [boolean, boolean] = [false, false];

  constructor(
    readonly code: string,
    host: Seatholder,
    public touched: number,
  ) {
    this.players = [host, null];
  }

  get isFull() {
    return this.players[1] !== null;
  }

  get isEmpty() {
    return this.players.every((p) => !p?.socketId);
  }

  join(guest: Seatholder) {
    if (this.isFull) throw new DomainError('A sala já está cheia.');
    this.players[1] = guest;
    this.startMatch();
  }

  startMatch() {
    const [a, b] = this.players;
    if (!b) throw new DomainError('Aguardando oponente.');
    this.game = createGame({
      players: [
        { name: a.name, deck: a.deck },
        { name: b.name, deck: b.deck },
      ],
    });
    this.rematch = [false, false];
  }

  seatOfSocket(socketId: string): Seat | null {
    const i = this.players.findIndex((p) => p?.socketId === socketId);
    return i < 0 ? null : (i as Seat);
  }

  seatholderByToken(token: string): Seatholder | null {
    return this.players.find((p): p is Seatholder => !!p && sameToken(p.token, token)) ?? null;
  }

  /** Marca o assento do socket como desconectado. */
  release(socketId: string) {
    const seat = this.seatOfSocket(socketId);
    if (seat !== null) this.players[seat]!.socketId = null;
  }

  /** Pede revanche; quando os dois pedem, começa um duelo novo. */
  requestRematch(seat: Seat) {
    if (!this.game || this.game.winner === null) return;
    this.rematch[seat] = true;
    if (this.rematch[0] && this.rematch[1]) this.startMatch();
  }

  isStale(now: number, ttlMs: number, idleTtlMs: number) {
    const idle = now - this.touched;
    return idle > ttlMs || (this.isEmpty && idle > idleTtlMs);
  }
}
