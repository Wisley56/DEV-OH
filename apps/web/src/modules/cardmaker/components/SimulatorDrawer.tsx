import { DEFAULT_CONFIG, pct, verdictTally, wilson, type BalanceReport } from '@devoh/ai/balance';
import { validateCustomInput, type PublishedCustomCard } from '@devoh/engine';
import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '../../../shared/ui';
import { startBalance, type BalanceHandle } from '../../balance';
import { customCards } from '../../catalog';
import { useCardMaker } from '../store/cardMakerStore';

/** Inclusões da carta nos decks gerados: dá umas centenas de duelos, poucos segundos. */
const MIN_GAMES = 200;

const VERDICT = { ok: 'Equilibrada', nerf: 'Forte demais', buff: 'Fraca demais', 'poucos-dados': 'Poucos dados' } as const;

/**
 * "Testar no simulador": os bots jogam decks aleatórios que sempre incluem o rascunho, contra
 * decks sem ele. Roda no navegador (worker), com os cards do painel instalados, e não publica nada.
 */
export function SimulatorDrawer({ onClose }: { onClose(): void }) {
  const input = useCardMaker((s) => s.input);
  const [id] = useState(() => input.id || 'x_rascunho_simulado');
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [report, setReport] = useState<BalanceReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [run, setRun] = useState(0);
  const handle = useRef<BalanceHandle | null>(null);

  useEffect(() => {
    const draft = { ...input, id };
    const problems = validateCustomInput(draft);
    if (problems.length) {
      setError(`Corrija antes de simular: ${problems[0]}`);
      return;
    }
    setError(null);
    setReport(null);
    const custom: PublishedCustomCard[] = [
      ...customCards().filter((c) => c.input.id !== id),
      { input: draft, serial: 9999, artVersion: 1, status: 'published' },
    ];
    handle.current = startBalance(
      { ...DEFAULT_CONFIG, mode: 'random', minGamesPerCard: MIN_GAMES, seed: Date.now() % 100_000, focus: [id] },
      custom,
      {
        progress: (done, total) => setProgress({ done, total }),
        done: (r) => setReport(r),
        error: setError,
      },
    );
    return () => handle.current?.terminate();
    // O rascunho é lido quando a gaveta abre (ou em "Rodar de novo").
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run]);

  const stat = report?.cards.find((c) => c.id === id);
  const tally = stat ? verdictTally(stat) : null;
  const ci = tally ? wilson(tally) : null;
  const pctDone = progress.total ? Math.round((100 * progress.done) / progress.total) : 0;

  return (
    <div className="confirm-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="cmk-sim panel" role="dialog" aria-modal="true" aria-label="Testar no simulador">
        <header>
          <h2>Testar no simulador</h2>
          <Button size="sm" variant="ghost" aria-label="Fechar" onClick={onClose}>
            <X size={18} aria-hidden />
          </Button>
        </header>
        <p className="muted">
          Os bots jogam decks aleatórios que sempre incluem <b>{input.name || 'a carta'}</b>, contra decks sem ela. Roda no seu navegador e
          não publica nada.
        </p>
        {error ? (
          <p className="warn" role="alert">
            {error}
          </p>
        ) : !report ? (
          <div className="cmk-sim-progress" role="status">
            <span className="mono">
              {progress.done} de {progress.total || '…'} duelos {pctDone}%
            </span>
            <div className="cmk-meter-bar">
              <span style={{ width: `${pctDone}%` }} />
            </div>
          </div>
        ) : (
          <div className="cmk-sim-result" role="status">
            <p className="cmk-sim-label">Vitórias de quem usa a carta</p>
            <p className="cmk-sim-rate">{tally ? pct(tally.games ? tally.wins / tally.games : null) : '—'}</p>
            {ci && (
              <p className="muted mono">
                intervalo de 95%: {pct(ci[0])} a {pct(ci[1])} · {tally!.games} duelos
              </p>
            )}
            <p className={`cmk-sim-verdict ${stat?.verdict ?? ''}`}>{stat ? VERDICT[stat.verdict] : 'Sem dados'}</p>
            {stat && (
              <dl className="cmk-base-stats">
                <dt>Duelos em que entrou em jogo</dt>
                <dd className="mono">{stat.played.games}</dd>
                <dt>Vezes jogada</dt>
                <dd className="mono">{stat.plays}</dd>
                <dt>Faixa saudável</dt>
                <dd className="mono">45–55%</dd>
              </dl>
            )}
          </div>
        )}
        <div className="cmk-sim-actions">
          <Button disabled={!report && !error} onClick={() => setRun((n) => n + 1)}>
            Rodar de novo
          </Button>
        </div>
      </aside>
    </div>
  );
}
