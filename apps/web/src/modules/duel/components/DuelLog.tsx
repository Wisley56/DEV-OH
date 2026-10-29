import { useEffect, useRef } from 'react';
import { Button } from '../../../shared/ui';
import { useDuel, useDuelUi } from '../hooks/useDuel';

/** Histórico do duelo (lateral no desktop; painel de baixo no celular). */
export function DuelLog() {
  const { view } = useDuel();
  const open = useDuelUi((s) => s.showLog);
  const toggleLog = useDuelUi((s) => s.toggleLog);
  const ref = useRef<HTMLDivElement>(null);
  const { log } = view;
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight });
  }, [log.length, open]);
  return (
    <div className={`log ${open ? 'open' : ''}`} data-tour="log">
      <button className="log-head" onClick={toggleLog}>
        📜 Histórico do duelo <span>{open ? '▾' : '▸'}</span>
      </button>
      <div className="log-body" ref={ref}>
        {log.map((l) => (
          <div key={l.id} className={`log-line log-${l.kind}`}>
            {l.text}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Botão flutuante do histórico no celular, com contador de novidades. */
export function LogFab() {
  const { view } = useDuel();
  const showLog = useDuelUi((s) => s.showLog);
  const seenLogId = useDuelUi((s) => s.seenLogId);
  const select = useDuelUi((s) => s.select);
  const toggleLog = useDuelUi((s) => s.toggleLog);
  const unread = view.log.filter((l) => l.id > seenLogId && l.kind !== 'draw').length;
  return (
    <Button
      className="log-fab"
      onClick={() => {
        select(null);
        toggleLog();
      }}
      aria-label="Histórico do duelo"
    >
      📜{unread > 0 && !showLog && <span className="log-fab-badge">{unread > 99 ? '99+' : unread}</span>}
    </Button>
  );
}
