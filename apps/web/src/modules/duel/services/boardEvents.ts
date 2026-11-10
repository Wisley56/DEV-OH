import type { GameView, LogEntry, LogSource, ProView, Seat } from '@devoh/engine';

/** Legenda da faixa de narração e o card que causou o evento (quando foi um efeito). */
interface Narration {
  caption?: string;
  source?: LogSource;
}

/** Mudança de ATK/DEF de um Profissional entre duas visões (sem contar o Estresse). */
export interface StatChange {
  seat: Seat;
  iid: string;
  atk: number;
  def: number;
}

export interface ProRef {
  seat: Seat;
  iid: string;
}

/**
 * Eventos visuais/sonoros do tabuleiro, na ordem em que aconteceram.
 * `seat` é sempre o assento absoluto (0/1); quem desenha converte para "eu/oponente".
 */
export type BoardEvent = Narration &
  (
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
    /** Profissional virado revelado (Invocação-Virar, atacado ou efeito): vira no lugar e continua no campo. */
    | { kind: 'flip'; seat: Seat; iid: string; cardId: string }
    /** Task ativada; `target` é o card escolhido (ex.: quem recebe o Equipamento). */
    | { kind: 'activate'; seat: Seat; iid: string; cardId: string; target?: string }
    | { kind: 'summon'; seat: Seat; iid: string; cardId: string }
    /** Dado rolado por um efeito: face tirada, bônus somado e se deu certo. */
    | { kind: 'dice'; seat: Seat; face: number; bonus: number; ok: boolean }
    | { kind: 'set'; seat: Seat }
    | { kind: 'turn'; seat: Seat }
    | { kind: 'end'; winner: Seat | 'draw' }
    /** Efeito ou habilidade resolvendo: a faixa conta o que houve e o card de origem pulsa. */
    | { kind: 'effect'; seat: Seat; target?: string }
    | { kind: 'stress'; seat: Seat; amount: number }
    /** Estresse no limite: o Profissional de maior nível pede demissão. */
    | { kind: 'meltdown'; seat: Seat }
    /** Profissional que voltou para a mão; sem `cardId` quando estava virado. */
    | { kind: 'bounce'; seat: Seat; iid: string; cardId?: string }
    /** ATK/DEF que mudaram nesta jogada: todos juntos, um número em cima de cada card. */
    | { kind: 'stat'; items: StatChange[] }
    | { kind: 'negate'; items: ProRef[] }
    | { kind: 'position'; items: (ProRef & { to: 'atk' | 'def' })[] }
  );

const other = (s: Seat): Seat => (s === 0 ? 1 : 0);
const SEATS: Seat[] = [0, 1];

/** O que aconteceu depois do ataque (até o próximo ataque ou o fim do lote): golpe ou defesa? */
function attackResult(entries: LogEntry[], from: number, defender: Seat, target?: string): BoardEvent {
  for (let i = from; i < entries.length && entries[i].kind !== 'attack'; i++) {
    const l = entries[i];
    if (l.kind === 'destroy' && target && l.iid === target) return { kind: 'hit', seat: defender, target };
    if (l.kind === 'damage' && l.seat === defender) return { kind: 'hit', seat: defender, target };
  }
  return { kind: 'block', seat: defender, target };
}

const faceDownCount = (view: GameView, seat: Seat) =>
  [...view.players[seat].spells, ...view.players[seat].pros].filter((x) => x?.faceDown).length;

/** ATK sem a parte do Estresse: ela muda a toda hora e já aparece no medidor. */
const ownAtk = (p: ProView) => (p.atk ?? 0) - (p.mods?.find((m) => m.rule === 'stress')?.atk ?? 0);

/** O que mudou nos Profissionais que estavam no campo antes e continuam depois, comparando as duas visões. */
function proChanges(prev: GameView, next: GameView) {
  const before = new Map<string, ProView>();
  for (const seat of SEATS) for (const p of prev.players[seat].pros) if (p) before.set(p.iid, p);
  const stat: StatChange[] = [];
  const negate: ProRef[] = [];
  const position: (ProRef & { to: 'atk' | 'def' })[] = [];
  for (const seat of SEATS) {
    for (const p of next.players[seat].pros) {
      const was = p && before.get(p.iid);
      if (!p || !was) continue;
      if (p.negated && !was.negated) negate.push({ seat, iid: p.iid });
      if (p.position !== was.position) position.push({ seat, iid: p.iid, to: p.position });
      // Card virado (ou que acabou de ser revelado, ou de virar outro card) não tem valor para comparar.
      if (p.atk === null || p.def === null || was.atk === null || was.def === null || p.cardId !== was.cardId) continue;
      const atk = ownAtk(p) - ownAtk(was);
      const def = p.def - was.def;
      if (atk || def) stat.push({ seat, iid: p.iid, atk, def });
    }
  }
  return { stat, negate, position };
}

/**
 * Eventos entre duas visões do mesmo duelo: as entradas novas do log (id > `lastLogId`)
 * e o que só aparece comparando as visões (card baixado virado, ATK/DEF, posição, anulação).
 */
export function boardEvents(prev: GameView | null, next: GameView, lastLogId: number): BoardEvent[] {
  const entries = next.log.filter((l) => l.id > lastLogId);
  const out: BoardEvent[] = [];

  if (prev) {
    for (const seat of SEATS) {
      if (faceDownCount(next, seat) > faceDownCount(prev, seat) && !entries.some((l) => l.kind === 'bug' && l.seat === seat)) {
        out.push({ kind: 'set', seat });
      }
    }
  }

  const flipFirst = new Set<number>();
  const told = (l: LogEntry): Narration => ({ caption: l.text, ...(l.source && { source: l.source }) });
  const flipEvent = (l: LogEntry): BoardEvent | null =>
    l.seat !== undefined && l.iid && l.cardId ? { kind: 'flip', seat: l.seat, iid: l.iid, cardId: l.cardId, ...told(l) } : null;
  entries.forEach((l, i) => {
    const seat = l.seat;
    switch (l.kind) {
      case 'attack': {
        if (seat === undefined || !l.iid) return;
        out.push({ kind: 'attack', seat, attacker: l.iid, target: l.target, ...told(l) });
        // Alvo virado: revela antes do golpe/defesa.
        const flip = entries.slice(i + 1).find((x) => x.kind === 'flip' && x.iid === l.target);
        const ev = flip && flipEvent(flip);
        if (flip && ev) {
          flipFirst.add(flip.id);
          out.push(ev);
        }
        out.push(attackResult(entries, i + 1, other(seat), l.target));
        return;
      }
      case 'flip': {
        const ev = flipEvent(l);
        if (ev && !flipFirst.has(l.id)) out.push(ev);
        return;
      }
      case 'damage':
        if (seat !== undefined && l.amount) out.push({ kind: 'damage', seat, amount: l.amount, ...told(l) });
        return;
      case 'heal':
        if (seat !== undefined && l.amount) out.push({ kind: 'heal', seat, amount: l.amount, ...told(l) });
        return;
      case 'destroy':
        if (seat !== undefined && l.iid && l.cardId) out.push({ kind: 'destroy', seat, iid: l.iid, cardId: l.cardId, ...told(l) });
        return;
      case 'bug':
        if (seat !== undefined && l.iid && l.cardId) out.push({ kind: 'reveal', seat, iid: l.iid, cardId: l.cardId, ...told(l) });
        return;
      case 'task':
        if (seat !== undefined && l.iid && l.cardId)
          out.push({ kind: 'activate', seat, iid: l.iid, cardId: l.cardId, ...(l.target && { target: l.target }), ...told(l) });
        return;
      case 'summon':
        if (seat !== undefined && l.iid && l.cardId) out.push({ kind: 'summon', seat, iid: l.iid, cardId: l.cardId, ...told(l) });
        return;
      case 'coin':
        if (seat !== undefined && l.roll) out.push({ kind: 'dice', seat, ...l.roll });
        return;
      case 'effect':
        if (seat === undefined) return;
        if (l.fx === 'bounce' && l.iid) out.push({ kind: 'bounce', seat, iid: l.iid, ...(l.cardId && { cardId: l.cardId }), ...told(l) });
        else out.push({ kind: 'effect', seat, ...(l.target && { target: l.target }), ...told(l) });
        return;
      case 'stress':
        if (seat === undefined) return;
        if (l.fx === 'meltdown') out.push({ kind: 'meltdown', seat, ...told(l) });
        // O +1 de cada dano de batalha é rotina: mostra o número, sem parar para a legenda.
        else if (l.amount) out.push({ kind: 'stress', seat, amount: l.amount, ...(l.source && told(l)) });
        return;
      case 'turn':
        if (seat !== undefined) out.push({ kind: 'turn', seat });
        return;
      case 'win':
        out.push({ kind: 'end', winner: next.winner ?? 'draw', caption: l.text });
        return;
    }
  });

  if (prev) {
    const { stat, negate, position } = proChanges(prev, next);
    // Mudar de posição pelo botão já se vê na hora; só chama atenção quando foi um efeito que mudou.
    const byEffect = entries.some((l) => l.source || l.kind === 'task' || l.kind === 'bug');
    const extra: BoardEvent[] = [];
    if (position.length && byEffect) extra.push({ kind: 'position', items: position });
    if (negate.length) extra.push({ kind: 'negate', items: negate });
    if (stat.length) extra.push({ kind: 'stat', items: stat });
    // O fim do duelo continua sendo o último evento.
    const end = out.at(-1)?.kind === 'end' ? out.pop() : undefined;
    out.push(...extra);
    if (end) out.push(end);
  }
  return out;
}
