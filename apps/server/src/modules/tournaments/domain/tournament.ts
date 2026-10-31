import { TOURNAMENT_MAX, TOURNAMENT_MIN, type TournamentPhase } from '@devoh/protocol';
import { randomInt } from 'node:crypto';
import { DomainError } from '../../../common/domain-error.js';
import { decided, knockoutPairs, planFor, roundRobin, shuffle, standings, type Match, type Rand, type Stage } from './bracket.js';

export interface Entrant {
  userId: string;
  name: string;
  deck: string[];
  /** null = desconectado (volta entrando com a mesma conta). */
  socketId: string | null;
  status: 'ativo' | 'eliminado' | 'saiu';
  /** Posição no sorteio do início: último critério de desempate. */
  order: number;
}

/**
 * Torneio: inscrição, fases e pódio. Não joga os duelos: diz quais estão pendentes
 * (`pending`) e recebe o resultado de cada um (`report`); o serviço cria as salas.
 */
export class Tournament {
  readonly entrants: Entrant[] = [];
  hostUserId: string;
  phase: TournamentPhase = 'inscricao';
  readonly matches: Match[] = [];
  podium: [string | null, string | null, string | null] = [null, null, null];
  /** Quem disputa a fase de pontos e as rodadas dela (todos contra todos). */
  group: string[] = [];
  private schedule: [string, string][][] = [];
  private round = 0;
  private bronze: string | null = null;
  private seq = 0;

  constructor(
    readonly code: string,
    host: Omit<Entrant, 'status' | 'order'>,
    public touched: number,
    /** Privado: entra só quem tem o código/convite (fora da lista do lobby). */
    readonly isPrivate = false,
    readonly createdAt = touched,
    private readonly rand: Rand = randomInt,
  ) {
    this.hostUserId = host.userId;
    this.entrants.push({ ...host, status: 'ativo', order: 0 });
  }

  get started() {
    return this.phase !== 'inscricao';
  }

  get isFull() {
    return this.entrants.length >= TOURNAMENT_MAX;
  }

  get host() {
    return this.entrant(this.hostUserId);
  }

  entrant(userId: string) {
    return this.entrants.find((e) => e.userId === userId) ?? null;
  }

  entrantBySocket(socketId: string) {
    return this.entrants.find((e) => e.socketId === socketId) ?? null;
  }

  /** Duelo em andamento da conta. */
  activeMatch(userId: string) {
    return this.matches.find((m) => m.status === 'jogando' && (m.a === userId || m.b === userId)) ?? null;
  }

  join(p: Omit<Entrant, 'status' | 'order'>) {
    if (this.started) throw new DomainError('Esse torneio já começou.');
    if (this.entrant(p.userId)) throw new DomainError('Você já está nesse torneio.');
    if (this.isFull) throw new DomainError(`O torneio já tem ${TOURNAMENT_MAX} jogadores.`);
    this.entrants.push({ ...p, status: 'ativo', order: 0 });
  }

  /** O anfitrião fecha a inscrição: sorteia a ordem de desempate e abre a primeira fase. */
  start(userId: string) {
    if (userId !== this.hostUserId) throw new DomainError('Só quem criou o torneio pode iniciar.');
    if (this.started) throw new DomainError('Esse torneio já começou.');
    if (this.entrants.length < TOURNAMENT_MIN) throw new DomainError(`O torneio precisa de pelo menos ${TOURNAMENT_MIN} jogadores.`);
    shuffle(this.entrants, this.rand).forEach((e, i) => (e.order = i));
    const ids = this.entrants.map((e) => e.userId);
    const first = planFor(ids.length);
    if (first === 'mata-mata') this.openKnockout(ids);
    else if (first === 'pontos') this.openPoints(ids);
    else this.openFinal(ids[0], ids[1]);
    this.advance();
  }

  /**
   * Sai do torneio. Na inscrição libera a vaga (e passa o posto de anfitrião); depois, os
   * duelos que faltam viram W.O. Retorna o duelo em andamento, para o serviço encerrar.
   */
  leave(userId: string): Match | null {
    const e = this.entrant(userId);
    if (!e) return null;
    if (!this.started) {
      this.entrants.splice(this.entrants.indexOf(e), 1);
      if (userId === this.hostUserId && this.entrants[0]) this.hostUserId = this.entrants[0].userId;
      return null;
    }
    e.socketId = null;
    if (e.status !== 'ativo' || this.phase === 'encerrado') return null;
    e.status = 'saiu';
    const active = this.activeMatch(userId);
    this.advance();
    return active;
  }

  /** Duelos prontos para começar (os dois lados presentes). */
  pending() {
    return this.matches.filter((m) => m.status === 'pendente');
  }

  /** O duelo começou na sala `roomCode`. */
  begin(matchId: string, roomCode: string) {
    const m = this.match(matchId);
    m.status = 'jogando';
    m.roomCode = roomCode;
  }

  /** Resultado de um duelo: `winner` é o assento (0 = a, 1 = b) ou null no empate. */
  report(matchId: string, winner: 0 | 1 | null, lp: [number, number]) {
    const m = this.matches.find((x) => x.id === matchId);
    if (!m || m.status === 'fim') return;
    m.status = 'fim';
    m.lp = lp;
    m.winner = winner === null ? 'draw' : winner === 0 ? 'a' : 'b';
    // Mata-mata e final precisam de um vencedor: empate joga de novo.
    if (m.winner === 'draw' && m.stage !== 'pontos') this.addMatch(m.stage, m.round, m.a, m.b);
    this.advance();
  }

  /** Inscritos ainda na disputa (nem eliminados nem fora). */
  private alive(ids: readonly string[]) {
    return ids.filter((id) => this.entrant(id)?.status === 'ativo');
  }

  private hasLeft = (id: string) => this.entrant(id)?.status === 'saiu';

  private match(id: string) {
    const m = this.matches.find((x) => x.id === id);
    if (!m) throw new DomainError('Duelo não encontrado.');
    return m;
  }

  private addMatch(stage: Stage, round: number, a: string, b: string | null) {
    const bye = b === null;
    this.matches.push({
      id: `${this.code}-${++this.seq}`,
      stage,
      round,
      a,
      b,
      status: bye ? 'fim' : 'pendente',
      winner: bye ? 'a' : null,
      lp: null,
      wo: false,
      roomCode: null,
    });
  }

  private openKnockout(ids: string[]) {
    this.phase = 'mata-mata';
    this.round = 1;
    for (const [a, b] of knockoutPairs(ids, this.rand)) this.addMatch('mata-mata', 1, a, b);
  }

  private openPoints(ids: string[]) {
    this.phase = 'pontos';
    this.group = ids;
    this.schedule = roundRobin(ids);
    this.round = 0;
    this.nextPointsRound();
  }

  private nextPointsRound() {
    this.round++;
    for (const [a, b] of this.schedule[this.round - 1]) this.addMatch('pontos', this.round, a, b);
  }

  private openFinal(a: string, b: string) {
    this.phase = 'final';
    this.round = 1;
    this.addMatch('final', 1, a, b);
  }

  /** Classificação atual da fase de pontos. */
  table() {
    const pts = this.matches.filter((m) => m.stage === 'pontos');
    return standings(this.group, pts, (id) => this.entrant(id)?.order ?? 0, this.hasLeft);
  }

  /** W.O. nos duelos de quem saiu e, quando a rodada termina, passa para a próxima etapa. */
  private advance() {
    for (;;) {
      for (const m of this.pending()) {
        const leftA = this.hasLeft(m.a);
        const leftB = !!m.b && this.hasLeft(m.b);
        if (!leftA && !leftB) continue;
        m.status = 'fim';
        m.wo = true;
        m.winner = leftA && leftB ? (m.stage === 'pontos' ? 'draw' : 'a') : leftA ? 'b' : 'a';
      }
      const current = this.matches.filter((m) => m.stage === this.phase && m.round === this.round);
      if (this.phase === 'encerrado' || current.some((m) => m.status !== 'fim')) return;
      if (!this.nextStage(current)) return;
    }
  }

  /** A rodada atual acabou: abre a próxima. Retorna true se abriu duelos novos para conferir. */
  private nextStage(round: Match[]): boolean {
    if (this.phase === 'mata-mata') {
      const decisive = round.map(decided).filter((d) => !!d);
      for (const d of decisive) if (d.loser) this.eliminate(d.loser);
      return this.afterCut(this.alive(decisive.map((d) => d.winner)));
    }
    if (this.phase === 'pontos') {
      if (this.round < this.schedule.length) {
        this.nextPointsRound();
        return true;
      }
      const ranked = this.table().map((s) => s.userId);
      const alive = this.alive(ranked);
      this.bronze = alive[2] ?? null;
      for (const id of alive.slice(3)) this.eliminate(id);
      if (alive.length < 2) return this.finish(alive[0] ?? null, null);
      this.openFinal(alive[0], alive[1]);
      return true;
    }
    // Final: o duelo decidido (o empate já pediu outro, que ainda não acabou).
    const d = round.map(decided).find((x) => !!x);
    if (!d) return false;
    return this.finish(d.winner, d.loser);
  }

  /** Depois do mata-mata: pontos com 3 ou mais; com 2 vai direto à final; com 1, acabou. */
  private afterCut(survivors: string[]): boolean {
    if (survivors.length >= 3) this.openPoints(survivors);
    else if (survivors.length === 2) this.openFinal(survivors[0], survivors[1]);
    else return this.finish(survivors[0] ?? null, null);
    return true;
  }

  private eliminate(id: string) {
    const e = this.entrant(id);
    if (e?.status === 'ativo') e.status = 'eliminado';
  }

  private finish(first: string | null, second: string | null): false {
    this.phase = 'encerrado';
    this.podium = [first, second, this.bronze];
    return false;
  }

  isEmpty() {
    return this.entrants.every((e) => !e.socketId);
  }

  isStale(now: number, ttlMs: number, idleTtlMs: number) {
    const idle = now - this.touched;
    return now - this.createdAt > ttlMs || ((this.isEmpty() || this.phase === 'encerrado') && idle > idleTtlMs);
  }
}
