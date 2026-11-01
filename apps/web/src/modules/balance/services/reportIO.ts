import {
  rate,
  REPORT_VERSION,
  reportsToMarkdown,
  verdictTally,
  wilson,
  type BalanceReport,
  type CardStat,
  type Verdict,
} from '@devoh/ai/balance';

/** Nome de arquivo do relatório: balanceamento-2026-10-31-1530.json */
export function reportFileName(r: BalanceReport, ext: 'json' | 'md') {
  const stamp = r.startedAt.slice(0, 16).replace('T', '-').replace(':', '');
  return `balanceamento-${stamp}.${ext}`;
}

export const reportToJson = (r: BalanceReport) => JSON.stringify(r, null, 2);
export const reportToMd = (r: BalanceReport) => reportsToMarkdown([r]);

/** Lê um relatório exportado (do painel ou do `npm run balance -- --json`). */
export function parseReport(text: string): BalanceReport {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('O arquivo não é um JSON válido.');
  }
  const r = data as Partial<BalanceReport> | null;
  if (!r || typeof r !== 'object' || !('version' in r)) throw new Error('Isso não parece um relatório de balanceamento.');
  if (r.version !== REPORT_VERSION) throw new Error(`Relatório da versão ${String(r.version)}; este painel lê a versão ${REPORT_VERSION}.`);
  if (!Array.isArray(r.cards) || !r.totals || !r.config) throw new Error('Relatório incompleto.');
  return r as BalanceReport;
}

/** Baixa um texto como arquivo. */
export function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Linha da tabela/gráfico de cards já calculada. */
export interface CardRow {
  stat: CardStat;
  /** Medida usada no veredito (no deck gerado, ou quando jogado). */
  winRate: number | null;
  ci: [number, number] | null;
  sample: number;
  /** Mesma medida no relatório de comparação. */
  baseline: number | null;
  /** Diferença em pontos percentuais (atual − comparação). */
  delta: number | null;
}

export type Metric = 'verdict' | 'included' | 'played';

const tallyFor = (c: CardStat, metric: Metric) => (metric === 'included' ? c.included : metric === 'played' ? c.played : verdictTally(c));

export function cardRows(report: BalanceReport, baseline: BalanceReport | null, metric: Metric): CardRow[] {
  const base = new Map(baseline?.cards.map((c) => [c.id, c]));
  return report.cards.map((stat) => {
    const t = tallyFor(stat, metric);
    const winRate = rate(t);
    const b = base.get(stat.id);
    const before = b ? rate(tallyFor(b, metric)) : null;
    return {
      stat,
      winRate,
      ci: wilson(t),
      sample: t.games,
      baseline: before,
      delta: winRate !== null && before !== null ? Math.round(100 * (winRate - before)) : null,
    };
  });
}

export interface CardFilter {
  kind: 'all' | CardStat['kind'];
  verdict: 'all' | Verdict;
  search: string;
}

export const EMPTY_CARD_FILTER: CardFilter = { kind: 'all', verdict: 'all', search: '' };

const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

export function filterRows(rows: CardRow[], f: CardFilter): CardRow[] {
  const q = fold(f.search.trim());
  return rows.filter(
    (r) =>
      (f.kind === 'all' || r.stat.kind === f.kind) &&
      (f.verdict === 'all' || r.stat.verdict === f.verdict) &&
      (!q || fold(r.stat.name).includes(q)),
  );
}

/** Do mais forte ao mais fraco; cards sem dados no fim. */
export const byWinRate = (a: CardRow, b: CardRow) => (b.winRate ?? -1) - (a.winRate ?? -1) || a.stat.name.localeCompare(b.stat.name);
