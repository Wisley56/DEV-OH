import type { BalanceMode } from '@devoh/ai/balance';
import { useRef, type ChangeEvent } from 'react';
import { useNow } from '../../../shared/lib/useNow';
import { Button } from '../../../shared/ui';
import { download, reportFileName, reportToJson, reportToMd } from '../services/reportIO';
import { useBalance } from '../store/balanceStore';

const MODES: { id: BalanceMode; label: string }[] = [
  { id: 'both', label: 'Decks iniciais + gerados' },
  { id: 'starters', label: 'Só decks iniciais' },
  { id: 'random', label: 'Só decks gerados' },
];

const clampInt = (v: string, min: number, max: number) => Math.max(min, Math.min(max, Math.floor(Number(v) || 0)));

const duration = (ms: number) => {
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s`;
};

/** Configuração da simulação, botões de rodar/cancelar, progresso e importar/exportar relatórios. */
export function RunForm() {
  const { config, status, progress, report, baseline, setConfig, run, cancel, importFile, useAsBaseline, clearBaseline } = useBalance();
  const running = status !== 'idle';
  const now = useNow(500, running);
  const openRef = useRef<HTMLInputElement>(null);
  const compareRef = useRef<HTMLInputElement>(null);

  const onFile = (as: 'report' | 'baseline') => async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) importFile(await file.text(), as);
  };

  const elapsed = now - progress.startedAt;
  const eta = progress.done > 0 ? (elapsed / progress.done) * (progress.total - progress.done) : null;
  const pct = progress.total ? Math.round((100 * progress.done) / progress.total) : 0;

  return (
    <div className="balance-run panel">
      <div className="balance-fields">
        <label>
          Decks
          <select value={config.mode} disabled={running} onChange={(e) => setConfig({ mode: e.target.value as BalanceMode })}>
            {MODES.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
        <label title="Partidas de cada par de decks iniciais, em cada ordem (12 confrontos).">
          Partidas por confronto
          <input
            type="number"
            min={1}
            max={1000}
            value={config.gamesPerMatchup}
            disabled={running || config.mode === 'random'}
            onChange={(e) => setConfig({ gamesPerMatchup: clampInt(e.target.value, 1, 1000) })}
          />
        </label>
        <label title="Decks gerados: a simulação continua até cada card estar em pelo menos tantas partidas.">
          Mínimo de partidas por card
          <input
            type="number"
            min={1}
            max={2000}
            value={config.minGamesPerCard}
            disabled={running || config.mode === 'starters'}
            onChange={(e) => setConfig({ minGamesPerCard: clampInt(e.target.value, 1, 2000) })}
          />
        </label>
        <label title="O bot difícil simula cada jogada: fica bem mais lento.">
          Bots
          <select
            value={config.levels.join('-')}
            disabled={running}
            onChange={(e) => setConfig({ levels: e.target.value === 'hard-normal' ? ['hard', 'normal'] : ['normal', 'normal'] })}
          >
            <option value="normal-normal">Normal × Normal</option>
            <option value="hard-normal">Difícil × Normal (lento)</option>
          </select>
        </label>
        <label title="Mesma seed e mesma configuração dão exatamente o mesmo resultado.">
          Seed
          <input
            type="number"
            min={0}
            value={config.seed}
            disabled={running}
            onChange={(e) => setConfig({ seed: clampInt(e.target.value, 0, 2 ** 30) })}
          />
        </label>
        <div className="balance-actions">
          {running ? (
            <Button variant="ghost" onClick={cancel} disabled={status === 'cancelling'}>
              {status === 'cancelling' ? 'Parando…' : '■ Cancelar'}
            </Button>
          ) : (
            <Button variant="primary" onClick={run}>
              ▶ Rodar simulação
            </Button>
          )}
        </div>
      </div>

      {running && (
        <div className="balance-progress" role="status" aria-live="polite">
          <div className="balance-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
            <span style={{ width: `${pct}%` }} />
          </div>
          <span>
            {progress.total ? `${progress.done} de ${progress.total} partidas (${pct}%)` : 'Montando os decks…'}
            {' · '}
            {duration(elapsed)}
            {eta !== null && ` · faltam ~${duration(eta)}`}
          </span>
        </div>
      )}

      <div className="balance-files">
        <input ref={openRef} type="file" accept=".json,application/json" hidden onChange={onFile('report')} />
        <input ref={compareRef} type="file" accept=".json,application/json" hidden onChange={onFile('baseline')} />
        <Button size="sm" variant="ghost" disabled={running} onClick={() => openRef.current?.click()}>
          📂 Abrir relatório
        </Button>
        {report && (
          <>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => download(reportFileName(report, 'json'), reportToJson(report), 'application/json')}
            >
              ⬇ JSON
            </Button>
            <Button size="sm" variant="ghost" onClick={() => download(reportFileName(report, 'md'), reportToMd(report), 'text/markdown')}>
              ⬇ Markdown
            </Button>
          </>
        )}
        <span className="balance-sep" />
        <Button size="sm" variant="ghost" disabled={running} onClick={() => compareRef.current?.click()}>
          ⚖ Comparar com arquivo…
        </Button>
        {report && report !== baseline && (
          <Button size="sm" variant="ghost" onClick={useAsBaseline} title="Guarda este resultado para comparar com a próxima execução.">
            📌 Usar este como comparação
          </Button>
        )}
        {baseline && (
          <span className="balance-baseline">
            Comparando com {new Date(baseline.startedAt).toLocaleString('pt-BR')}{' '}
            <button type="button" className="balance-link" onClick={clearBaseline}>
              remover
            </button>
          </span>
        )}
      </div>
    </div>
  );
}
