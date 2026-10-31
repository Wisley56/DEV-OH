import { applyAction, createGame, forfeit, other, type GameState, type Seat } from '@devoh/engine';
import { randomInt, randomUUID } from 'node:crypto';
import { DomainError } from '../../../common/domain-error.js';

/** Estouros de tempo seguidos que dão derrota. */
export const MAX_TIMEOUTS = 3;

export interface Seatholder {
  /** Conta dona do assento: é por ela que a pessoa volta depois de cair. */
  userId: string;
  name: string;
  deck: string[];
  /** null = desconectado (pode voltar entrando com a mesma conta). */
  socketId: string | null;
  /** Caiu no meio do duelo: perde por W.O. se não voltar até aqui (ms). */
  reconnectDeadline: number | null;
}

/** Sala de duelo: dois assentos, o estado do jogo, o relógio do turno e os pedidos de revanche. */
export class Room {
  readonly players: [Seatholder, Seatholder | null];
  game: GameState | null = null;
  rematch: [boolean, boolean] = [false, false];
  /** Turno que o relógio está contando ("turno:jogador"); muda a cada troca de vez. */
  turnKey: string | null = null;
  turnDeadline: number | null = null;
  /** Estouros de tempo seguidos de cada assento (zera quando a pessoa joga). */
  timeouts: [number, number] = [0, 0];
  /** Partida atual (muda a cada revanche) e se o resultado dela já foi para o ranking. */
  matchId: string | null = null;
  recorded = false;
  /** Variação de Elo de cada assento na última partida registrada. */
  eloDelta: [number | null, number | null] = [null, null];

  constructor(
    readonly code: string,
    host: Seatholder,
    public touched: number,
    /** Sala privada: entra só quem tem o código/convite (não aparece na lista do lobby). */
    readonly isPrivate = false,
    readonly createdAt = touched,
  ) {
    this.players = [host, null];
  }

  get isFull() {
    return this.players[1] !== null;
  }

  get isEmpty() {
    return this.players.every((p) => !p?.socketId);
  }

  /** Duelo em andamento (começou e ninguém venceu ainda). */
  get playing() {
    return !!this.game && this.game.winner === null;
  }

  join(guest: Seatholder) {
    if (this.isFull) throw new DomainError('A sala já está cheia.');
    if (guest.userId === this.players[0].userId) throw new DomainError('Você já está nessa sala. Chame outra pessoa para duelar.');
    this.players[1] = guest;
    this.startMatch();
  }

  startMatch() {
    const [a, b] = this.players;
    if (!b) throw new DomainError('Aguardando oponente.');
    // Seed e quem começa vêm do crypto: o Math.random do V8 é previsível.
    this.game = createGame({
      seed: randomInt(2 ** 31),
      first: randomInt(2) as Seat,
      players: [
        { name: a.name, deck: a.deck },
        { name: b.name, deck: b.deck },
      ],
    });
    this.matchId = randomUUID();
    this.recorded = false;
    this.eloDelta = [null, null];
    this.rematch = [false, false];
    this.timeouts = [0, 0];
    this.turnKey = null;
    this.turnDeadline = null;
  }

  seatOfSocket(socketId: string): Seat | null {
    const i = this.players.findIndex((p) => p?.socketId === socketId);
    return i < 0 ? null : (i as Seat);
  }

  seatholderByUser(userId: string): Seatholder | null {
    return this.players.find((p): p is Seatholder => p?.userId === userId) ?? null;
  }

  /** Acabou e o resultado ainda não foi para o ranking. */
  get needsRecord() {
    return !!this.game && this.game.winner !== null && !this.recorded;
  }

  /** Marca o assento do socket como desconectado; no meio do duelo, começa a contagem do W.O. */
  release(socketId: string, now: number, reconnectMs: number) {
    const seat = this.seatOfSocket(socketId);
    if (seat === null) return;
    const p = this.players[seat]!;
    p.socketId = null;
    if (this.playing) p.reconnectDeadline = now + reconnectMs;
  }

  /** Voltou com a mesma conta: cancela a contagem do W.O. */
  reconnect(p: Seatholder, socketId: string) {
    p.socketId = socketId;
    p.reconnectDeadline = null;
  }

  /** Pede revanche; quando os dois pedem, começa um duelo novo. */
  requestRematch(seat: Seat) {
    if (!this.game || this.game.winner === null) return;
    this.rematch[seat] = true;
    if (this.rematch[0] && this.rematch[1]) this.startMatch();
  }

  /** O jogador agiu: o contador de estouros dele volta a zero. */
  noteAction(seat: Seat) {
    this.timeouts[seat] = 0;
  }

  /** Acerta o relógio: turno novo arma o prazo; fora de duelo, desliga. Retorna true se armou. */
  syncTurn(now: number, turnMs: number): boolean {
    const g = this.game;
    if (!g || g.winner !== null) {
      this.turnKey = null;
      this.turnDeadline = null;
      return false;
    }
    const key = `${g.turn}:${g.active}`;
    if (key === this.turnKey) return false;
    this.turnKey = key;
    this.turnDeadline = now + turnMs;
    return true;
  }

  /** O tempo do turno acabou: passa a vez; no estouro número MAX_TIMEOUTS seguido, derrota. */
  expireTurn() {
    const g = this.game;
    if (!g || g.winner !== null) return;
    const seat = g.active;
    this.timeouts[seat]++;
    if (this.timeouts[seat] >= MAX_TIMEOUTS) {
      this.game = forfeit(g, seat, 'timeout');
      return;
    }
    const r = applyAction(g, seat, { type: 'endTurn' });
    if (r.ok) this.game = r.state;
  }

  /** Prazo de volta acabou: perde por W.O. — só se o oponente ainda estiver na sala. */
  expireReconnect(seat: Seat) {
    const p = this.players[seat];
    if (!p) return;
    p.reconnectDeadline = null;
    if (!this.game || !this.playing || p.socketId) return;
    if (!this.players[other(seat)]?.socketId) return;
    this.game = forfeit(this.game, seat, 'abandon');
  }

  isStale(now: number, ttlMs: number, idleTtlMs: number) {
    const idle = now - this.touched;
    return idle > ttlMs || (this.isEmpty && idle > idleTtlMs);
  }
}
