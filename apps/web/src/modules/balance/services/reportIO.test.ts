import { runBalance, type BalanceReport } from '@devoh/ai/balance';
import { describe, expect, it } from 'vitest';
import { inTarget, winRateColor } from './colorScale';
import { cardRows, EMPTY_CARD_FILTER, filterRows, parseReport, reportFileName, reportToJson } from './reportIO';

const report: BalanceReport = runBalance({
  mode: 'starters',
  gamesPerMatchup: 1,
  minGamesPerCard: 0,
  levels: ['normal', 'normal'],
  seed: 1,
});

describe('relatório: importar/exportar', () => {
  it('ida e volta pelo JSON', () => {
    expect(parseReport(reportToJson(report))).toEqual(report);
    expect(reportFileName(report, 'json')).toMatch(/^balanceamento-\d{4}-\d{2}-\d{2}-\d{4}\.json$/);
  });

  it('recusa arquivo que não é relatório ou de outra versão', () => {
    expect(() => parseReport('não é json')).toThrow(/JSON válido/);
    expect(() => parseReport('{"a":1}')).toThrow(/relatório/);
    expect(() => parseReport(JSON.stringify({ ...report, version: 99 }))).toThrow(/versão 99/);
  });
});

describe('linhas de cards', () => {
  it('compara com outro relatório em pontos percentuais', () => {
    const base = structuredClone(report);
    const id = report.cards.find((c) => c.played.games > 0)!.id;
    const c = base.cards.find((x) => x.id === id)!;
    c.played = { games: c.played.games, wins: 0 };
    const row = cardRows(report, base, 'played').find((r) => r.stat.id === id)!;
    expect(row.baseline).toBe(0);
    expect(row.delta).toBe(Math.round(100 * row.winRate!));
  });

  it('filtra por tipo e busca sem acento', () => {
    const rows = cardRows(report, null, 'played');
    expect(filterRows(rows, { ...EMPTY_CARD_FILTER, kind: 'bug' }).every((r) => r.stat.kind === 'bug')).toBe(true);
    expect(filterRows(rows, { ...EMPTY_CARD_FILTER, search: 'reuniao' }).map((r) => r.stat.id)).toEqual(['reuniao']);
  });
});

describe('escala de cor', () => {
  it('cinza no meio, azul abaixo, vermelho acima', () => {
    expect(winRateColor(0.5)).toBe('#383835');
    expect(winRateColor(0.2)).toBe('#3987e5');
    expect(winRateColor(0.9)).toBe('#e66767');
    expect(inTarget(0.5)).toBe(true);
    expect(inTarget(0.6)).toBe(false);
  });
});
