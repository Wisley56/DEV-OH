import type { BalanceReport } from '@devoh/ai/balance';
import { useEffect, useMemo, useState } from 'react';
import { CenterScreen, PageHead, Panel } from '../../../shared/ui';
import { useAccount } from '../../auth';
import { cardRows, EMPTY_CARD_FILTER, filterRows, type CardFilter, type Metric } from '../services/reportIO';
import { stopBalanceWorker, useBalance } from '../store/balanceStore';
import { CardTable } from './CardTable';
import { MatchupHeatmap } from './MatchupHeatmap';
import { RunForm } from './RunForm';
import { SummaryTiles } from './SummaryTiles';
import { KIND_LABEL, VERDICT_LABEL, WinRateChart } from './WinRateChart';

const METRICS: { id: Metric; label: string; short: string; title: string }[] = [
  {
    id: 'verdict',
    label: 'Usada no veredito',
    short: 'do veredito',
    title: 'No deck gerado quando há 30+ partidas; senão, quando jogado.',
  },
  {
    id: 'included',
    label: 'Com o card no deck gerado',
    short: 'no deck gerado',
    title: 'Mede o card em si: decks aleatórios com e sem ele. É a medida menos enviesada.',
  },
  {
    id: 'played',
    label: 'Quando o card foi jogado',
    short: 'quando jogado',
    title: 'Enviesada: cards caros aparecem mais em partidas que já estavam ganhas.',
  },
];

/** Painel admin de balanceamento: só contas com is_admin. */
export function BalanceDashboard() {
  const { account } = useAccount();
  useEffect(() => stopBalanceWorker, []);

  if (!account?.isAdmin)
    return (
      <CenterScreen>
        <Panel className="require-account">
          <h2>Acesso restrito</h2>
          <p>Esta página é só para administradores.</p>
        </Panel>
      </CenterScreen>
    );

  return (
    <div className="page balance-page">
      <PageHead title="Balanceamento" />
      <p className="muted balance-hint">
        Bots jogam milhares de partidas no seu navegador (nada roda no servidor). Os decks gerados colocam todos os cards do catálogo em
        jogo, para achar quem pede buff ou nerf.
      </p>
      <RunForm />
      <BalanceError />
      <Report />
    </div>
  );
}

function BalanceError() {
  const error = useBalance((s) => s.error);
  return error ? <p className="warn">{error}</p> : null;
}

function Report() {
  const report = useBalance((s) => s.report);
  const baseline = useBalance((s) => s.baseline);
  if (!report) return <p className="muted balance-empty">Rode uma simulação ou abra um relatório exportado.</p>;
  return (
    <>
      <SummaryTiles report={report} />
      {report.matchups && <MatchupHeatmap matchups={report.matchups} />}
      <CardsSection report={report} baseline={baseline === report ? null : baseline} />
      <BudgetList report={report} />
    </>
  );
}

function CardsSection({ report, baseline }: { report: BalanceReport; baseline: BalanceReport | null }) {
  const hasGenerated = report.config.mode !== 'starters';
  const [metric, setMetric] = useState<Metric>('verdict');
  const [filter, setFilter] = useState<CardFilter>(EMPTY_CARD_FILTER);
  const effective: Metric = !hasGenerated && metric === 'included' ? 'played' : metric;
  const rows = useMemo(() => filterRows(cardRows(report, baseline, effective), filter), [report, baseline, effective, filter]);
  const set = <K extends keyof CardFilter>(k: K, v: CardFilter[K]) => setFilter((f) => ({ ...f, [k]: v }));
  const m = METRICS.find((x) => x.id === effective)!;

  return (
    <section className="balance-section">
      <h2>Cards</h2>
      <div className="balance-filters">
        <label title={m.title}>
          Medida
          <select value={effective} onChange={(e) => setMetric(e.target.value as Metric)}>
            {METRICS.filter((x) => hasGenerated || x.id !== 'included').map((x) => (
              <option key={x.id} value={x.id}>
                {x.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tipo
          <select value={filter.kind} onChange={(e) => set('kind', e.target.value as CardFilter['kind'])}>
            <option value="all">Todos</option>
            {Object.entries(KIND_LABEL).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Veredito
          <select value={filter.verdict} onChange={(e) => set('verdict', e.target.value as CardFilter['verdict'])}>
            <option value="all">Todos</option>
            {Object.entries(VERDICT_LABEL).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Buscar
          <input type="search" value={filter.search} placeholder="Nome do card" onChange={(e) => set('search', e.target.value)} />
        </label>
      </div>
      <p className="muted balance-hint">{m.title}</p>
      <WinRateChart rows={rows} metricLabel={m.short} hasBaseline={!!baseline} />
      <CardTable rows={rows} hasBaseline={!!baseline} showIncluded={hasGenerated} />
    </section>
  );
}

function BudgetList({ report }: { report: BalanceReport }) {
  return (
    <section className="balance-section">
      <h2>Orçamento de ATK/DEF por nível</h2>
      {report.budget.length ? (
        <>
          <p className="muted balance-hint">Acima do orçamento do nível. Efeito fraco pode justificar; revise caso a caso.</p>
          <ul className="balance-budget">
            {report.budget.map((b) => (
              <li key={b.id}>
                <b>{b.name}</b> ⭐{b.level} · {b.atk}/{b.def} — {b.over.join(', ')}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="muted">Todos os Profissionais dentro do orçamento.</p>
      )}
    </section>
  );
}
