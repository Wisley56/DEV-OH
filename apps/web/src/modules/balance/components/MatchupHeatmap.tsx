import { pct, type BalanceReport } from '@devoh/ai/balance';
import { inTarget, MID_COLOR, STRONG_COLOR, TARGET_BAND, WEAK_COLOR, winRateColor } from '../services/colorScale';

/**
 * Matriz de confrontos dos decks iniciais: win rate da linha contra a coluna.
 * Cor divergente centrada em 50%; a coluna Total marca quem está fora da meta de 45–55%.
 */
export function MatchupHeatmap({ matchups }: { matchups: NonNullable<BalanceReport['matchups']> }) {
  const { decks, wins, games } = matchups;
  return (
    <section className="balance-section">
      <h2>Confrontos entre decks iniciais</h2>
      <p className="muted balance-hint">
        Win rate do deck da linha contra o da coluna, somando os dois lados da mesa. Meta: cada deck entre {pct(TARGET_BAND[0])} e{' '}
        {pct(TARGET_BAND[1])} no total.
      </p>
      <div className="balance-scroll">
        <table className="balance-heatmap">
          <thead>
            <tr>
              <th scope="col">Deck × oponente</th>
              {decks.map((d) => (
                <th key={d.id} scope="col">
                  {d.name}
                </th>
              ))}
              <th scope="col">Total</th>
            </tr>
          </thead>
          <tbody>
            {decks.map((d, i) => {
              const w = wins[i].reduce((a, b) => a + b, 0);
              const g = games[i].reduce((a, b) => a + b, 0);
              const total = g ? w / g : null;
              return (
                <tr key={d.id}>
                  <th scope="row">{d.name}</th>
                  {decks.map((o, j) => {
                    if (i === j) return <td key={o.id} className="hm-self" aria-label="mesmo deck" />;
                    const p = games[i][j] ? wins[i][j] / games[i][j] : null;
                    return (
                      <td
                        key={o.id}
                        className="hm-cell"
                        style={p === null ? undefined : { background: winRateColor(p) }}
                        title={`${d.name} venceu ${wins[i][j]} de ${games[i][j]} contra ${o.name}`}
                      >
                        {pct(p)}
                      </td>
                    );
                  })}
                  <td className="hm-total" style={total === null ? undefined : { background: winRateColor(total) }}>
                    {pct(total)}{' '}
                    {total !== null && (inTarget(total) ? <span title="Dentro da meta">✓</span> : <span title="Fora da meta">⚠</span>)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="balance-scale" aria-hidden>
        <span>30% · perde mais</span>
        <i style={{ background: `linear-gradient(90deg, ${WEAK_COLOR}, ${MID_COLOR}, ${STRONG_COLOR})` }} />
        <span>ganha mais · 70%</span>
      </div>
    </section>
  );
}
