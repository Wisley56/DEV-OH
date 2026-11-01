import { applyAction, card, CARD_LIST, createGame, STARTER_DECKS, type CardKind, type GameState, type Seat } from '@devoh/engine';
import { botAction, type BotLevel } from '../index';
import { budgetAudit, type BudgetIssue } from './budget';
import { focusRotation, generateDeck, seededRng } from './deckGen';
import { verdictOf, type Tally, type Verdict } from './stats';

/** Sobe quando o formato do relatório mudar (relatórios importados de outra versão são recusados). */
export const REPORT_VERSION = 1;

/**
 * starters: só os decks iniciais entre si (confrontos + cards deles).
 * random: decks gerados, para que todo card do catálogo seja testado.
 * both: os dois.
 */
export type BalanceMode = 'starters' | 'random' | 'both';

export interface BalanceConfig {
  mode: BalanceMode;
  /** Partidas por confronto entre decks iniciais (cada par ordenado). */
  gamesPerMatchup: number;
  /** Decks gerados: cada card precisa estar em pelo menos tantas partidas. */
  minGamesPerCard: number;
  /** Bot de cada assento. */
  levels: [BotLevel, BotLevel];
  seed: number;
}

export const DEFAULT_CONFIG: BalanceConfig = {
  mode: 'both',
  gamesPerMatchup: 40,
  minGamesPerCard: 60,
  levels: ['normal', 'normal'],
  seed: 0,
};

export interface CardStat {
  id: string;
  name: string;
  kind: CardKind;
  /** Partidas em que o card foi jogado (invocado, ativado ou disparado) e quantas o dono venceu. */
  played: Tally;
  /** Partidas com o card no deck gerado (jogado ou não). Menos enviesado que `played`. */
  included: Tally;
  plays: number;
  damage: number;
  destroyed: number;
  verdict: Verdict;
}

export interface BalanceReport {
  version: typeof REPORT_VERSION;
  config: BalanceConfig;
  /** ISO 8601. */
  startedAt: string;
  durationMs: number;
  /** Cancelado no meio: os números cobrem só as partidas jogadas. */
  cancelled: boolean;
  totals: {
    games: number;
    starterGames: number;
    generatedGames: number;
    /** Partidas com vencedor (sem empate nem limite de jogadas). */
    decided: number;
    firstWins: number;
    turns: number;
  };
  /** Só com decks iniciais: wins[i][j] = vitórias de i contra j, somando os dois assentos. */
  matchups: { decks: { id: string; name: string }[]; wins: number[][]; games: number[][] } | null;
  cards: CardStat[];
  budget: BudgetIssue[];
}

/** O veredito usa o card no deck gerado (sem viés de "jogado quando já estava ganhando") se houver dados. */
export const verdictTally = (c: Pick<CardStat, 'played' | 'included'>): Tally => (c.included.games >= 30 ? c.included : c.played);

interface PlannedGame {
  decks: [string[], string[]];
  seed: number;
  first: Seat;
  /** Índices dos decks iniciais (null = deck gerado). */
  starter: [number | null, number | null];
}

interface GameResult {
  winner: Seat | 'draw' | null;
  turns: number;
  /** Cards jogados por assento, uma vez por partida. */
  played: [Set<string>, Set<string>];
  plays: Map<string, number>;
  damage: Map<string, number>;
  destroyed: Map<string, number>;
}

const MAX_STEPS = 3000;
/** Trava de segurança do plano de decks gerados. */
const MAX_GENERATED_GAMES = 50_000;
const FOCUS_PER_DECK = 3;

const add = (m: Map<string, number>, k: string, n = 1) => m.set(k, (m.get(k) ?? 0) + n);

function playGame(g: PlannedGame, levels: [BotLevel, BotLevel]): GameResult {
  let s: GameState = createGame({
    players: [
      { name: 'A', deck: g.decks[0] },
      { name: 'B', deck: g.decks[1] },
    ],
    seed: g.seed,
    first: g.first,
  });
  const res: GameResult = {
    winner: null,
    turns: 0,
    played: [new Set(), new Set()],
    plays: new Map(),
    damage: new Map(),
    destroyed: new Map(),
  };
  let lastLog = 0;
  let attacker: string | undefined;
  for (let steps = 0; s.winner === null && steps < MAX_STEPS; steps++) {
    let r = applyAction(s, s.active, botAction(s, s.active, levels[s.active]));
    // Jogada ilegal do bot: encerra o turno (igual ao Treino) em vez de derrubar a simulação toda.
    if (!r.ok) r = applyAction(s, s.active, { type: 'endTurn' });
    if (!r.ok) break;
    s = r.state;
    for (const l of s.log) {
      if (l.id <= lastLog) continue;
      if ((l.kind === 'summon' || l.kind === 'task' || l.kind === 'bug') && l.cardId && l.seat !== undefined) {
        res.played[l.seat].add(l.cardId);
        add(res.plays, l.cardId);
      }
      if (l.kind === 'attack') attacker = l.cardId;
      if (l.kind === 'damage' && attacker && l.amount) add(res.damage, attacker, l.amount);
      if (l.kind === 'turn') attacker = undefined;
      if (l.kind === 'destroy' && l.cardId && card(l.cardId).kind === 'pro') add(res.destroyed, l.cardId);
    }
    lastLog = s.log.at(-1)?.id ?? lastLog;
  }
  res.winner = s.winner;
  res.turns = s.turn;
  return res;
}

function planGames(config: BalanceConfig): PlannedGame[] {
  const plan: PlannedGame[] = [];
  const n = STARTER_DECKS.length;
  if (config.mode !== 'random') {
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        for (let g = 0; g < config.gamesPerMatchup; g++) {
          // Mesmas seeds do script antigo (seed 0): os números batem com relatórios anteriores.
          plan.push({
            decks: [STARTER_DECKS[i].cards, STARTER_DECKS[j].cards],
            seed: config.seed + 1000 * i + 100 * j + g,
            first: (g % 2) as Seat,
            starter: [i, j],
          });
        }
      }
  }
  if (config.mode !== 'starters' && config.minGamesPerCard > 0) {
    const rng = seededRng(config.seed + 0x5eed);
    const nextFocus = focusRotation(rng);
    const inclusion = new Map(CARD_LIST.map((c) => [c.id, 0]));
    const count = (deck: string[]) => new Set(deck).forEach((id) => add(inclusion, id));
    const covered = () => [...inclusion.values()].every((v) => v >= config.minGamesPerCard);
    for (let k = 0; !covered() && k < MAX_GENERATED_GAMES; k++) {
      const gen = generateDeck(rng, nextFocus(FOCUS_PER_DECK));
      // Alterna: gerado × inicial e gerado × gerado; o gerado troca de assento a cada par.
      const vsStarter = k % 2 === 0;
      const si = (k >> 1) % n;
      const other = vsStarter ? STARTER_DECKS[si].cards : generateDeck(rng, nextFocus(FOCUS_PER_DECK));
      count(gen);
      if (!vsStarter) count(other);
      const genSeat: Seat = ((k >> 1) % 2) as Seat;
      const decks: [string[], string[]] = genSeat === 0 ? [gen, other] : [other, gen];
      const starter: [number | null, number | null] = [null, null];
      if (vsStarter) starter[genSeat === 0 ? 1 : 0] = si;
      plan.push({ decks, seed: config.seed + 1_000_000 + k, first: (k % 2) as Seat, starter });
    }
  }
  return plan;
}

export interface BalanceRun {
  /** Partidas planejadas. */
  readonly total: number;
  /** Partidas já jogadas. */
  readonly done: number;
  /** Joga a próxima partida; false quando não há mais nenhuma. */
  step(): boolean;
  /** Relatório com o que já foi jogado. */
  report(cancelled?: boolean): BalanceReport;
}

/**
 * Simulação passo a passo: o CLI roda tudo de uma vez; o painel do web roda em pedaços
 * dentro de um Web Worker, para mostrar o progresso e poder cancelar.
 */
export function createBalanceRun(config: BalanceConfig): BalanceRun {
  const started = Date.now();
  const plan = planGames(config);
  const n = STARTER_DECKS.length;
  const wins = STARTER_DECKS.map(() => STARTER_DECKS.map(() => 0));
  const games = STARTER_DECKS.map(() => STARTER_DECKS.map(() => 0));
  const stats = new Map(
    CARD_LIST.map((c) => [c.id, { played: { games: 0, wins: 0 }, included: { games: 0, wins: 0 }, plays: 0, damage: 0, destroyed: 0 }]),
  );
  const totals = { games: 0, starterGames: 0, generatedGames: 0, decided: 0, firstWins: 0, turns: 0 };
  let next = 0;

  return {
    total: plan.length,
    get done() {
      return next;
    },
    step() {
      if (next >= plan.length) return false;
      const g = plan[next++];
      const r = playGame(g, config.levels);
      totals.games++;
      totals.turns += r.turns;
      const [s0, s1] = g.starter;
      if (s0 !== null && s1 !== null) {
        totals.starterGames++;
        games[s0][s1]++;
        games[s1][s0]++;
        if (r.winner === 0) wins[s0][s1]++;
        if (r.winner === 1) wins[s1][s0]++;
      } else totals.generatedGames++;
      if (r.winner === 0 || r.winner === 1) {
        totals.decided++;
        if (r.winner === g.first) totals.firstWins++;
      }
      for (const seat of [0, 1] as Seat[]) {
        const won = r.winner === seat ? 1 : 0;
        for (const id of r.played[seat]) {
          const st = stats.get(id)!;
          st.played.games++;
          st.played.wins += won;
        }
        if (g.starter[seat] === null)
          for (const id of new Set(g.decks[seat])) {
            const st = stats.get(id)!;
            st.included.games++;
            st.included.wins += won;
          }
      }
      for (const [id, v] of r.plays) stats.get(id)!.plays += v;
      for (const [id, v] of r.damage) stats.get(id)!.damage += v;
      for (const [id, v] of r.destroyed) stats.get(id)!.destroyed += v;
      return next < plan.length;
    },
    report(cancelled = false) {
      const cards: CardStat[] = CARD_LIST.map((c) => {
        const st = stats.get(c.id)!;
        const stat = { id: c.id, name: c.name, kind: c.kind, ...structuredClone(st) };
        return { ...stat, verdict: verdictOf(verdictTally(stat)) };
      });
      return {
        version: REPORT_VERSION,
        config: structuredClone(config),
        startedAt: new Date(started).toISOString(),
        durationMs: Date.now() - started,
        cancelled,
        totals: { ...totals },
        matchups:
          config.mode === 'random'
            ? null
            : {
                decks: STARTER_DECKS.slice(0, n).map((d) => ({ id: d.id, name: d.name })),
                wins: structuredClone(wins),
                games: structuredClone(games),
              },
        cards,
        budget: budgetAudit(),
      };
    },
  };
}

/** Roda a simulação inteira de uma vez (bloqueia: use no CLI ou dentro de um worker). */
export function runBalance(config: BalanceConfig): BalanceReport {
  const run = createBalanceRun(config);
  while (run.step());
  return run.report();
}
