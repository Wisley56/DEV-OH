import { pct, rate, wilson } from './stats';
import { verdictTally, type BalanceReport } from './simulate';

const VERDICT_LABEL = { nerf: '🔻 nerf?', buff: '🔺 buff?', ok: '', 'poucos-dados': '' } as const;

const ci = (t: { games: number; wins: number }) => {
  const w = wilson(t);
  return w ? `${pct(w[0])}–${pct(w[1])}` : '—';
};

/** Relatório em Markdown (o mesmo que o `npm run balance` imprime). */
export function reportToMarkdown(r: BalanceReport): string {
  const { config, totals } = r;
  const lines: string[] = [];
  const modeLabel = { starters: 'decks iniciais', random: 'decks gerados', both: 'decks iniciais + gerados' }[config.mode];
  lines.push(`## ${config.levels.join(' × ')} — ${modeLabel} (${totals.games} partidas${r.cancelled ? ', CANCELADO' : ''})`, '');
  if (config.mode !== 'random')
    lines.push(`- Decks iniciais: ${config.gamesPerMatchup} partidas por confronto (${totals.starterGames} no total)`);
  if (config.mode !== 'starters')
    lines.push(`- Decks gerados: ${totals.generatedGames} partidas (cada card em ≥ ${config.minGamesPerCard})`);
  lines.push(`- Vitórias de quem começa: **${pct(totals.decided ? totals.firstWins / totals.decided : null)}**`);
  lines.push(`- Duração média: **${totals.games ? (totals.turns / totals.games).toFixed(1) : '—'} turnos**`, '');

  if (r.matchups) {
    const { decks, wins, games } = r.matchups;
    lines.push(`| Deck (linha) × oponente | ${decks.map((d) => d.name).join(' | ')} | **Total** |`);
    lines.push(`|---|${decks.map(() => '---').join('|')}|---|`);
    decks.forEach((d, i) => {
      const cells = decks.map((_, j) => (i === j ? '—' : pct(rate({ wins: wins[i][j], games: games[i][j] }))));
      const w = wins[i].reduce((a, b) => a + b, 0);
      const g = games[i].reduce((a, b) => a + b, 0);
      lines.push(`| ${d.name} | ${cells.join(' | ')} | **${pct(rate({ wins: w, games: g }))}** |`);
    });
    lines.push('');
  }

  const hasIncluded = config.mode !== 'starters';
  lines.push('### Cards', '');
  lines.push(
    hasIncluded
      ? '| Card | Veredito | No deck gerado | Win rate no deck (IC 95%) | Jogado em | Win rate quando jogado | Jogadas | Dano | Destruído |'
      : '| Card | Veredito | Jogado em | Win rate quando jogado (IC 95%) | Jogadas | Dano | Destruído |',
  );
  lines.push(hasIncluded ? '|---|---|---|---|---|---|---|---|---|' : '|---|---|---|---|---|---|---|');
  const rows = r.cards
    .filter((c) => c.played.games || c.included.games)
    .sort((a, b) => (rate(verdictTally(b)) ?? 0) - (rate(verdictTally(a)) ?? 0));
  for (const c of rows) {
    const v = VERDICT_LABEL[c.verdict];
    const tail = `${c.plays} | ${c.damage} | ${c.destroyed} |`;
    lines.push(
      hasIncluded
        ? `| ${c.name} | ${v} | ${c.included.games} | ${pct(rate(c.included))} (${ci(c.included)}) | ${c.played.games} | ${pct(rate(c.played))} | ${tail}`
        : `| ${c.name} | ${v} | ${c.played.games} | ${pct(rate(c.played))} (${ci(c.played)}) | ${tail}`,
    );
  }
  const unused = r.cards.filter((c) => !c.played.games).map((c) => c.name);
  if (unused.length) lines.push('', `Nunca jogados: ${unused.join(', ')}.`);
  return lines.join('\n');
}

export function budgetToMarkdown(r: BalanceReport): string {
  if (!r.budget.length) return '## Orçamento por nível\n\nTodos os Profissionais dentro do orçamento.';
  return [
    '## Orçamento por nível (revisar caso a caso)',
    '',
    '| Card | Nível | ATK/DEF | Acima de |',
    '|---|---|---|---|',
    ...r.budget.map((b) => `| ${b.name} | ⭐${b.level} | ${b.atk}/${b.def} | ${b.over.join(', ')} |`),
  ].join('\n');
}

/** Documento completo: uma seção por relatório e a auditoria de orçamento no fim. */
export function reportsToMarkdown(reports: BalanceReport[]): string {
  const sections = reports.map(reportToMarkdown);
  if (reports.length) sections.push(budgetToMarkdown(reports[0]));
  return `# Balanceamento DEV-OH!\n\n${sections.join('\n\n')}\n`;
}
