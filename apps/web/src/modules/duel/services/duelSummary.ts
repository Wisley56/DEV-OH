import type { GameView, LogEntry, LogKind } from '@devoh/engine';
import { winnerText } from './interaction';

/** Um passo da linha do tempo "Como terminou". */
export interface SummaryStep {
  id: number;
  kind: LogKind;
  text: string;
  cardId?: string;
  amount?: number;
  /** Quem fez/sofreu: 'me' ou 'opp' (do ponto de vista de quem vê). */
  side?: 'me' | 'opp';
}

export interface DuelSummary {
  tone: 'win' | 'lose' | 'draw';
  title: string;
  /** Por que o duelo acabou, em uma frase. */
  headline: string;
  steps: SummaryStep[];
  lp: { me: number; opp: number };
}

/** Entradas do log que contam a história do fim do duelo. */
const STORY: ReadonlySet<LogKind> = new Set(['summon', 'task', 'bug', 'effect', 'attack', 'damage', 'heal', 'destroy', 'coin', 'stress']);
const MAX_STEPS = 8;

function headline(view: GameView): string {
  const o = view.outcome;
  const oppName = view.players[view.you === 0 ? 1 : 0].name;
  if (!o || o.reason === 'draw') return 'Os dois zeraram os LP ao mesmo tempo.';
  const mine = o.loser === view.you;
  switch (o.reason) {
    case 'lp':
      return mine ? 'Seus LP chegaram a 0.' : `Os LP de ${oppName} chegaram a 0.`;
    case 'deckout':
      return mine ? 'Seu deck acabou — backlog vazio.' : `O deck de ${oppName} acabou — backlog vazio.`;
    case 'surrender':
      return mine ? 'Você desistiu do duelo.' : `${oppName} desistiu do duelo.`;
    case 'timeout':
      return mine ? 'Você estourou o tempo 3 vezes seguidas.' : `${oppName} estourou o tempo 3 vezes seguidas.`;
    case 'abandon':
      return mine ? 'Você saiu da sala e não voltou a tempo.' : `${oppName} abandonou a sala — vitória por W.O.`;
  }
}

/** Passos do turno final (desde o último "turno"); se o turno foi curto, inclui o anterior. */
function finalSteps(view: GameView): SummaryStep[] {
  const log = view.log;
  const turnStarts = log.flatMap((l, i) => (l.kind === 'turn' ? [i] : []));
  const story = (from: number) => log.slice(from).filter((l) => STORY.has(l.kind) && !(l.kind === 'stress' && !l.text.includes('limite')));
  let entries: LogEntry[] = story(turnStarts.at(-1) ?? 0);
  if (entries.length < 2 && turnStarts.length > 1) entries = story(turnStarts.at(-2)!);
  return entries.slice(-MAX_STEPS).map((l) => ({
    id: l.id,
    kind: l.kind,
    text: l.text,
    cardId: l.cardId,
    amount: l.amount,
    side: l.seat === undefined ? undefined : l.seat === view.you ? 'me' : 'opp',
  }));
}

/** Resumo do fim do duelo para quem está vendo; null enquanto o duelo continua. */
export function duelSummary(view: GameView): DuelSummary | null {
  const title = winnerText(view);
  if (!title) return null;
  const opp = view.you === 0 ? 1 : 0;
  return {
    tone: view.winner === 'draw' ? 'draw' : view.winner === view.you ? 'win' : 'lose',
    title,
    headline: headline(view),
    steps: finalSteps(view),
    lp: { me: view.players[view.you].lp, opp: view.players[opp].lp },
  };
}
