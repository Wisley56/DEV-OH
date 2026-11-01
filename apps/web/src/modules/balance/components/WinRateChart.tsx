import { pct } from '@devoh/ai/balance';
import { useState } from 'react';
import { byWinRate, type CardRow } from '../services/reportIO';

export const KIND_LABEL = { pro: 'Profissional', task: 'Task', bug: 'Bug' } as const;
export const VERDICT_LABEL = { nerf: 'Pede nerf', buff: 'Pede buff', ok: 'Equilibrado', 'poucos-dados': 'Poucos dados' } as const;

/** Eixo: múltiplos de 10% que cobrem todos os intervalos, nunca mais estreito que 30–70%. */
function domain(rows: CardRow[]): [number, number] {
  let lo = 0.3;
  let hi = 0.7;
  for (const r of rows) {
    if (r.ci) {
      lo = Math.min(lo, r.ci[0]);
      hi = Math.max(hi, r.ci[1]);
    }
    if (r.baseline !== null) {
      lo = Math.min(lo, r.baseline);
      hi = Math.max(hi, r.baseline);
    }
  }
  return [Math.floor(lo * 10) / 10, Math.ceil(hi * 10) / 10];
}

interface Tip {
  row: CardRow;
  x: number;
  y: number;
}

/**
 * Win rate de cada card com o intervalo de confiança de 95% (o traço), do mais forte ao mais fraco.
 * Card cujo traço inteiro fica de um lado de 50% e longe do meio recebe o veredito de nerf/buff.
 */
export function WinRateChart({ rows, metricLabel, hasBaseline }: { rows: CardRow[]; metricLabel: string; hasBaseline: boolean }) {
  const [tip, setTip] = useState<Tip | null>(null);
  const data = rows.filter((r) => r.winRate !== null).sort(byWinRate);
  const missing = rows.length - data.length;
  const [lo, hi] = domain(data);
  const x = (p: number) => `${((p - lo) / (hi - lo)) * 100}%`;
  const ticks: number[] = [];
  for (let t = lo; t <= hi + 1e-9; t += 0.1) ticks.push(Math.round(t * 10) / 10);

  if (!data.length) return <p className="muted">Nenhum card com partidas neste filtro.</p>;

  const axis = (
    <div className="wr-row wr-axis" aria-hidden>
      <span />
      <div className="wr-track">
        {ticks.map((t) => (
          <span key={t} style={{ left: x(t) }}>
            {pct(t)}
          </span>
        ))}
      </div>
      <span />
    </div>
  );

  return (
    <div className="wr-chart" onMouseLeave={() => setTip(null)}>
      <div className="wr-legend" aria-hidden>
        <span>
          <i className="wr-dot v-nerf" /> pede nerf
        </span>
        <span>
          <i className="wr-dot v-buff" /> pede buff
        </span>
        <span>
          <i className="wr-dot v-ok" /> equilibrado
        </span>
        <span>
          <i className="wr-dot v-poucos-dados" /> poucos dados
        </span>
        <span>
          <i className="wr-ci-sample" /> intervalo de 95%
        </span>
        {hasBaseline && (
          <span>
            <i className="wr-base" /> comparação
          </span>
        )}
      </div>
      {axis}
      <div className="wr-body" role="list" aria-label={`Win rate ${metricLabel} por card`}>
        <div className="wr-guides" aria-hidden>
          <span />
          <div className="wr-track">
            {ticks.map((t) => (
              <i key={t} className={t === 0.5 ? 'mid' : ''} style={{ left: x(t) }} />
            ))}
          </div>
          <span />
        </div>
        {data.map((r) => (
          <div
            key={r.stat.id}
            className="wr-row"
            role="listitem"
            tabIndex={0}
            aria-label={`${r.stat.name}: ${pct(r.winRate)}, ${VERDICT_LABEL[r.stat.verdict]}`}
            onMouseMove={(e) => setTip({ row: r, x: e.clientX, y: e.clientY })}
            onFocus={(e) => {
              const b = e.currentTarget.getBoundingClientRect();
              setTip({ row: r, x: b.left + b.width / 2, y: b.bottom });
            }}
            onBlur={() => setTip(null)}
          >
            <span className="wr-name">{r.stat.name}</span>
            <div className="wr-track">
              {r.ci && <i className="wr-ci" style={{ left: x(r.ci[0]), width: `calc(${x(r.ci[1])} - ${x(r.ci[0])})` }} />}
              {r.baseline !== null && <i className="wr-base" style={{ left: x(r.baseline) }} />}
              <i className={`wr-dot v-${r.stat.verdict}`} style={{ left: x(r.winRate!) }} />
            </div>
            <span className="wr-value">{pct(r.winRate)}</span>
          </div>
        ))}
      </div>
      {axis}
      {missing > 0 && <p className="muted balance-hint">{missing} card(s) sem partidas nesta medida ficaram de fora.</p>}
      {tip && (
        <div className="wr-tip" style={{ left: tip.x + 14, top: tip.y + 14 }} role="tooltip">
          <b>{tip.row.stat.name}</b>
          <span>
            {KIND_LABEL[tip.row.stat.kind]} · {VERDICT_LABEL[tip.row.stat.verdict]}
          </span>
          <span>
            Win rate {metricLabel}: <b>{pct(tip.row.winRate)}</b> em {tip.row.sample} partidas
          </span>
          {tip.row.ci && (
            <span>
              Intervalo de 95%: {pct(tip.row.ci[0])} a {pct(tip.row.ci[1])}
            </span>
          )}
          {tip.row.delta !== null && (
            <span>
              Comparação: {pct(tip.row.baseline)} ({tip.row.delta > 0 ? '+' : ''}
              {tip.row.delta} p.p.)
            </span>
          )}
        </div>
      )}
    </div>
  );
}
