import { pct, type BalanceReport } from '@devoh/ai/balance';

const LEVEL = { normal: 'Normal', hard: 'Difícil' } as const;

/** Números de cabeçalho do relatório. */
export function SummaryTiles({ report }: { report: BalanceReport }) {
  const { totals, config, cards } = report;
  const neverPlayed = cards.filter((c) => !c.played.games);
  const nerf = cards.filter((c) => c.verdict === 'nerf').length;
  const buff = cards.filter((c) => c.verdict === 'buff').length;
  const tiles: { label: string; value: string; note?: string; title?: string }[] = [
    {
      label: 'Partidas',
      value: totals.games.toLocaleString('pt-BR'),
      note: [totals.starterGames && `${totals.starterGames} iniciais`, totals.generatedGames && `${totals.generatedGames} geradas`]
        .filter(Boolean)
        .join(' · '),
    },
    { label: 'Quem começa vence', value: pct(totals.decided ? totals.firstWins / totals.decided : null), note: 'ideal perto de 50%' },
    { label: 'Duração média', value: totals.games ? `${(totals.turns / totals.games).toFixed(1)}` : '—', note: 'turnos' },
    { label: 'Pedem nerf / buff', value: `${nerf} / ${buff}`, note: 'pelo intervalo de confiança' },
    {
      label: 'Nunca jogados',
      value: String(neverPlayed.length),
      note: neverPlayed.length ? 'o bot nunca usou' : 'todos os cards foram usados',
      title: neverPlayed.map((c) => c.name).join(', '),
    },
  ];
  return (
    <>
      <p className="muted balance-meta">
        {new Date(report.startedAt).toLocaleString('pt-BR')} · Bots {config.levels.map((l) => LEVEL[l]).join(' × ')} · seed {config.seed} ·{' '}
        {(report.durationMs / 1000).toFixed(1)} s{report.cancelled && <b className="warn"> · cancelado no meio (resultado parcial)</b>}
      </p>
      <div className="balance-tiles">
        {tiles.map((t) => (
          <div key={t.label} className="balance-tile" title={t.title}>
            <span className="bt-label">{t.label}</span>
            <b className="bt-value">{t.value}</b>
            {t.note && <span className="bt-note">{t.note}</span>}
          </div>
        ))}
      </div>
    </>
  );
}
