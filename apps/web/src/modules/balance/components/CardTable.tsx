import { pct, rate, wilson, type Tally } from '@devoh/ai/balance';
import { useMemo, useState } from 'react';
import { byWinRate, type CardRow } from '../services/reportIO';
import { KIND_LABEL, VERDICT_LABEL } from './WinRateChart';

type SortKey = 'winRate' | 'delta' | 'name' | 'included' | 'played' | 'plays' | 'damage' | 'destroyed';

const ci = (t: Tally) => {
  const w = wilson(t);
  return w ? `${pct(w[0])}–${pct(w[1])}` : '';
};

const SORTERS: Record<SortKey, (a: CardRow, b: CardRow) => number> = {
  winRate: byWinRate,
  delta: (a, b) => (b.delta ?? -999) - (a.delta ?? -999),
  name: (a, b) => a.stat.name.localeCompare(b.stat.name),
  included: (a, b) => b.stat.included.games - a.stat.included.games,
  played: (a, b) => b.stat.played.games - a.stat.played.games,
  plays: (a, b) => b.stat.plays - a.stat.plays,
  damage: (a, b) => b.stat.damage - a.stat.damage,
  destroyed: (a, b) => b.stat.destroyed - a.stat.destroyed,
};

/** Tabela completa dos cards (também é a versão acessível do gráfico). Clique no cabeçalho para ordenar. */
export function CardTable({ rows, hasBaseline, showIncluded }: { rows: CardRow[]; hasBaseline: boolean; showIncluded: boolean }) {
  const [sort, setSort] = useState<{ key: SortKey; asc: boolean }>({ key: 'winRate', asc: false });
  const sorted = useMemo(() => {
    const list = [...rows].sort(SORTERS[sort.key]);
    return sort.asc ? list.reverse() : list;
  }, [rows, sort]);

  const th = (key: SortKey, label: string, title?: string) => (
    <th scope="col" title={title} aria-sort={sort.key === key ? (sort.asc ? 'ascending' : 'descending') : undefined}>
      <button type="button" onClick={() => setSort((s) => ({ key, asc: s.key === key ? !s.asc : false }))}>
        {label}
        {sort.key === key ? (sort.asc ? ' ▲' : ' ▼') : ''}
      </button>
    </th>
  );

  return (
    <div className="balance-scroll">
      <table className="balance-table">
        <thead>
          <tr>
            {th('name', 'Card')}
            <th scope="col">Veredito</th>
            {th('winRate', 'Win rate', 'A medida escolhida acima, com o intervalo de 95%')}
            {hasBaseline && th('delta', 'Δ', 'Diferença para o relatório de comparação, em pontos percentuais')}
            {showIncluded && th('included', 'No deck gerado', 'Partidas com o card num deck gerado e win rate do dono')}
            {th('played', 'Jogado em', 'Partidas em que o card foi invocado/ativado/disparado e win rate do dono')}
            {th('plays', 'Jogadas')}
            {th('damage', 'Dano')}
            {th('destroyed', 'Destruído')}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => {
            const s = r.stat;
            return (
              <tr key={s.id}>
                <th scope="row" className="bt-name">
                  <i className={`kind-dot k-${s.kind}`} title={KIND_LABEL[s.kind]} /> {s.name}
                </th>
                <td className={`verdict v-${s.verdict}`}>{VERDICT_LABEL[s.verdict]}</td>
                <td>
                  <b>{pct(r.winRate)}</b> <span className="muted">{r.ci ? `${pct(r.ci[0])}–${pct(r.ci[1])}` : ''}</span>
                </td>
                {hasBaseline && <td>{r.delta === null ? '—' : `${r.delta > 0 ? '+' : ''}${r.delta}`}</td>}
                {showIncluded && (
                  <td>
                    {s.included.games} · {pct(rate(s.included))} <span className="muted">{ci(s.included)}</span>
                  </td>
                )}
                <td>
                  {s.played.games} · {pct(rate(s.played))}
                </td>
                <td>{s.plays}</td>
                <td>{s.damage.toLocaleString('pt-BR')}</td>
                <td>{s.destroyed}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
