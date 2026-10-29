import type { GameView, LogEntry, Seat } from '@devoh/engine';

/**
 * Eventos visuais/sonoros do tabuleiro, na ordem em que aconteceram.
 * `seat` é sempre o assento absoluto (0/1); quem desenha converte para "eu/oponente".
 */
export type BoardEvent =
  | { kind: 'attack'; seat: Seat; attacker: string; target?: string }
  /** Golpe que passou: no Profissional alvo ou, sem alvo, no HUD do defensor. */
  | { kind: 'hit'; seat: Seat; target?: string }
  /** Defesa bem-sucedida: o alvo aguentou, o ataque foi negado ou o dano bloqueado. */
  | { kind: 'block'; seat: Seat; target?: string }
  | { kind: 'damage'; seat: Seat; amount: number }
  | { kind: 'heal'; seat: Seat; amount: number }
  | { kind: 'destroy'; seat: Seat; iid: string; cardId: string }
  /** Bug virado que disparou: vira, aparece e vai para o cemitério. */
  | { kind: 'reveal'; seat: Seat; iid: string; cardId: string }
  /** Task ativada da mão. */
  | { kind: 'activate'; seat: Seat; iid: string; cardId: string }
  | { kind: 'summon'; seat: Seat; iid: string; cardId: string }
  /** Dado rolado por um efeito: face tirada, bônus somado e se deu certo. */
  | { kind: 'dice'; seat: Seat; face: number; bonus: number; ok: boolean }
  | { kind: 'set'; seat: Seat }
  | { kind: 'turn'; seat: Seat }
  | { kind: 'end'; winner: Seat | 'draw' };

const other = (s: Seat): Seat => (s === 0 ? 1 : 0);

/** O que aconteceu depois do ataque (até o próximo ataque ou o fim do lote): golpe ou defesa? */
function attackResult(entries: LogEntry[], from: number, defender: Seat, target?: string): BoardEvent {
  for (let i = from; i < entries.length && entries[i].kind !== 'attack'; i++) {
    const l = entries[i];
    if (l.kind === 'destroy' && target && l.iid === target) return { kind: 'hit', seat: defender, target };
    if (l.kind === 'damage' && l.seat === defender) return { kind: 'hit', seat: defender, target };
  }
  return { kind: 'block', seat: defender, target };
}

const faceDownCount = (view: GameView, seat: Seat) => view.players[seat].spells.filter((x) => x?.faceDown).length;

/**
 * Eventos entre duas visões do mesmo duelo: as entradas novas do log (id > `lastLogId`)
 * e o que só aparece comparando as visões (Bug baixado virado).
 */
export function boardEvents(prev: GameView | null, next: GameView, lastLogId: number): BoardEvent[] {
  const entries = next.log.filter((l) => l.id > lastLogId);
  const out: BoardEvent[] = [];

  if (prev) {
    for (const seat of [0, 1] as Seat[]) {
      if (faceDownCount(next, seat) > faceDownCount(prev, seat) && !entries.some((l) => l.kind === 'bug' && l.seat === seat)) {
        out.push({ kind: 'set', seat });
      }
    }
  }

  entries.forEach((l, i) => {
    const seat = l.seat;
    switch (l.kind) {
      case 'attack':
        if (seat === undefined || !l.iid) return;
        out.push({ kind: 'attack', seat, attacker: l.iid, target: l.target });
        out.push(attackResult(entries, i + 1, other(seat), l.target));
        return;
      case 'damage':
        if (seat !== undefined && l.amount) out.push({ kind: 'damage', seat, amount: l.amount });
        return;
      case 'heal':
        if (seat !== undefined && l.amount) out.push({ kind: 'heal', seat, amount: l.amount });
        return;
      case 'destroy':
        if (seat !== undefined && l.iid && l.cardId) out.push({ kind: 'destroy', seat, iid: l.iid, cardId: l.cardId });
        return;
      case 'bug':
        if (seat !== undefined && l.iid && l.cardId) out.push({ kind: 'reveal', seat, iid: l.iid, cardId: l.cardId });
        return;
      case 'task':
        if (seat !== undefined && l.iid && l.cardId) out.push({ kind: 'activate', seat, iid: l.iid, cardId: l.cardId });
        return;
      case 'summon':
        if (seat !== undefined && l.iid && l.cardId) out.push({ kind: 'summon', seat, iid: l.iid, cardId: l.cardId });
        return;
      case 'coin':
        if (seat !== undefined && l.roll) out.push({ kind: 'dice', seat, ...l.roll });
        return;
      case 'turn':
        if (seat !== undefined) out.push({ kind: 'turn', seat });
        return;
      case 'win':
        out.push({ kind: 'end', winner: next.winner ?? 'draw' });
        return;
    }
  });
  return out;
}
