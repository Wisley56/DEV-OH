/**
 * Balanceamento: round-robin dos decks iniciais com os bots e relatório em Markdown.
 *
 *   npm run balance                     # 40 partidas por confronto, bot normal × normal
 *   npm run balance -- --games 100      # mais partidas (mais lento, menos ruído)
 *   npm run balance -- --hard           # inclui o bot difícil (hard × normal), bem mais lento
 *   npm run balance -- --out docs/balance/latest.md
 *
 * Roda direto do código-fonte (condição "source" dos pacotes), sem precisar de build.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { applyAction, card, CARD_LIST, cardFrame, createGame, STARTER_DECKS, type GameState, type Seat } from '@devoh/engine';
import { botAction, type BotLevel } from '../src/index';

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const opt = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const GAMES = Number(opt('games') ?? 40);
const OUT = opt('out');

interface CardStat {
  games: number;
  wins: number;
  plays: number;
  damage: number;
  destroyed: number;
}

interface Result {
  winner: Seat | 'draw' | null;
  turns: number;
  /** Cards jogados por assento (invocados, ativados, Bugs disparados) — uma vez por partida. */
  played: [Set<string>, Set<string>];
  plays: Map<string, number>;
  damage: Map<string, number>;
  destroyed: Map<string, number>;
}

const add = (m: Map<string, number>, k: string, n = 1) => m.set(k, (m.get(k) ?? 0) + n);

function play(d0: string[], d1: string[], seed: number, first: Seat, levels: [BotLevel, BotLevel]): Result {
  let s: GameState = createGame({
    players: [
      { name: 'A', deck: d0 },
      { name: 'B', deck: d1 },
    ],
    seed,
    first,
  });
  const res: Result = {
    winner: null,
    turns: 0,
    played: [new Set(), new Set()],
    plays: new Map(),
    damage: new Map(),
    destroyed: new Map(),
  };
  let lastLog = 0;
  let attacker: string | undefined;
  for (let steps = 0; s.winner === null && steps < 3000; steps++) {
    const r = applyAction(s, s.active, botAction(s, s.active, levels[s.active]));
    if (!r.ok) throw new Error(`seed ${seed}: ação ilegal: ${r.error}`);
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

const pct = (a: number, b: number) => (b ? `${Math.round((100 * a) / b)}%` : '—');

function run(levels: [BotLevel, BotLevel]) {
  const decks = STARTER_DECKS;
  const wins = decks.map(() => decks.map(() => 0));
  const games = decks.map(() => decks.map(() => 0));
  const cards = new Map<string, CardStat>(CARD_LIST.map((c) => [c.id, { games: 0, wins: 0, plays: 0, damage: 0, destroyed: 0 }]));
  let firstWins = 0;
  let decided = 0;
  let turns = 0;
  let total = 0;
  for (let i = 0; i < decks.length; i++) {
    for (let j = 0; j < decks.length; j++) {
      if (i === j) continue;
      for (let g = 0; g < GAMES; g++) {
        const first = (g % 2) as Seat;
        const r = play(decks[i].cards, decks[j].cards, 1000 * i + 100 * j + g, first, levels);
        total++;
        turns += r.turns;
        games[i][j]++;
        if (r.winner === 0) wins[i][j]++;
        if (r.winner === 0 || r.winner === 1) {
          decided++;
          if (r.winner === first) firstWins++;
        }
        for (const seat of [0, 1] as Seat[]) {
          for (const id of r.played[seat]) {
            const st = cards.get(id)!;
            st.games++;
            if (r.winner === seat) st.wins++;
          }
        }
        for (const [id, n] of r.plays) cards.get(id)!.plays += n;
        for (const [id, n] of r.damage) cards.get(id)!.damage += n;
        for (const [id, n] of r.destroyed) cards.get(id)!.destroyed += n;
      }
    }
  }

  const lines: string[] = [];
  lines.push(`## ${levels.join(' × ')} — ${GAMES} partidas por confronto (${total} no total)`, '');
  lines.push(`- Vitórias de quem começa: **${pct(firstWins, decided)}**`);
  lines.push(`- Duração média: **${(turns / total).toFixed(1)} turnos**`, '');
  lines.push(`| Deck (linha) × oponente | ${decks.map((d) => d.name).join(' | ')} | **Total** |`);
  lines.push(`|---|${decks.map(() => '---').join('|')}|---|`);
  decks.forEach((d, i) => {
    // Vitórias de i contra j somam os jogos em que i era o jogador A e os em que era o B.
    const cells = decks.map((_, j) => (i === j ? '—' : pct(wins[i][j] + (games[j][i] - wins[j][i]), games[i][j] + games[j][i])));
    const w = decks.reduce((n, _, j) => n + (i === j ? 0 : wins[i][j] + games[j][i] - wins[j][i]), 0);
    const g = decks.reduce((n, _, j) => n + (i === j ? 0 : games[i][j] + games[j][i]), 0);
    lines.push(`| ${d.name} | ${cells.join(' | ')} | **${pct(w, g)}** |`);
  });
  lines.push('', '### Cards (só os que foram jogados)', '');
  lines.push('| Card | Partidas jogado | Win rate quando jogado | Jogadas | Dano causado | Vezes destruído |');
  lines.push('|---|---|---|---|---|---|');
  const rows = [...cards.entries()].filter(([, st]) => st.games > 0).sort((a, b) => b[1].wins / b[1].games - a[1].wins / a[1].games);
  for (const [id, st] of rows) {
    const warn = st.games >= 20 && st.wins / st.games > 0.65 ? ' ⚠️' : '';
    lines.push(`| ${card(id).name}${warn} | ${st.games} | ${pct(st.wins, st.games)} | ${st.plays} | ${st.damage} | ${st.destroyed} |`);
  }
  const unused = CARD_LIST.filter((c) => !cards.get(c.id)!.games).map((c) => c.name);
  if (unused.length) lines.push('', `Nunca jogados: ${unused.join(', ')}.`);
  return lines.join('\n');
}

/**
 * Orçamento de referência por nível: soma ATK+DEF e teto de ATK (Normal ganha +10%).
 * Efeito forte conta como orçamento extra — a lista é para revisar caso a caso, não é erro.
 */
const BUDGET: { max: number; sum: number; atk?: number }[] = [
  { max: 2, sum: 2000 },
  { max: 3, sum: 2600 },
  { max: 4, sum: 3200, atk: 1900 },
  { max: 6, sum: 4300, atk: 2400 },
  { max: 8, sum: 5300 },
  { max: 99, sum: 6000 },
];

function budgetAudit(): string {
  const rows = CARD_LIST.filter((c) => c.kind === 'pro').flatMap((c) => {
    const b = BUDGET.find((x) => (c.level ?? 1) <= x.max)!;
    const sum = (c.atk ?? 0) + (c.def ?? 0);
    const bonus = cardFrame(c) === 'normal' ? 1.1 : 1;
    const limit = Math.round(b.sum * bonus);
    const atkCap = b.atk && Math.round(b.atk * bonus);
    const over = [sum > limit && `soma ${sum} > ${limit}`, atkCap && (c.atk ?? 0) > atkCap && `ATK ${c.atk} > ${atkCap}`].filter(Boolean);
    return over.length ? [`| ${c.name} | ⭐${c.level} | ${c.atk}/${c.def} | ${over.join(', ')} |`] : [];
  });
  if (!rows.length) return '## Orçamento por nível\n\nTodos os Profissionais dentro do orçamento.';
  return ['## Orçamento por nível (revisar caso a caso)', '', '| Card | Nível | ATK/DEF | Acima de |', '|---|---|---|---|', ...rows].join(
    '\n',
  );
}

const started = Date.now();
const sections = [run(['normal', 'normal'])];
if (flag('hard')) sections.push(run(['hard', 'normal']));
sections.push(budgetAudit());
const report = `# Balanceamento DEV-OH!\n\n${sections.join('\n\n')}\n`;
console.log(report);
console.error(`(${((Date.now() - started) / 1000).toFixed(1)} s)`);
if (OUT) {
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, report);
}
