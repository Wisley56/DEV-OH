import { ChevronDown, ChevronRight, ScrollText } from 'lucide-react';
import { card, cardExists, type LogEntry } from '@devoh/engine';
import { useEffect, useMemo, useRef } from 'react';
import { Button } from '../../../shared/ui';
import { useDuel, useDuelUi } from '../hooks/useDuel';
import { groupLog } from '../services/logGroups';

/** Histórico do duelo (lateral no desktop; painel de baixo no celular). */
export function DuelLog() {
  const { view } = useDuel();
  const open = useDuelUi((s) => s.showLog);
  const toggleLog = useDuelUi((s) => s.toggleLog);
  const ref = useRef<HTMLDivElement>(null);
  const { log } = view;
  const groups = useMemo(() => groupLog(log), [log]);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight });
  }, [log.length, open]);
  return (
    <div className={`log ${open ? 'open' : ''}`} data-tour="log">
      <button className="log-head" onClick={toggleLog}>
        <ScrollText size={16} aria-hidden /> Histórico do duelo{' '}
        {open ? <ChevronDown size={16} aria-hidden /> : <ChevronRight size={16} aria-hidden />}
      </button>
      <div className="log-body" ref={ref}>
        {groups.map((g, i) => (
          <div key={g.head.id} className={`log-group ${i === groups.length - 1 && g.rest.length ? 'latest' : ''}`}>
            <div className={`log-line log-${g.head.kind}`}>{g.head.text}</div>
            {g.rest.map((l) => (
              <div key={l.id} className={`log-line log-sub log-${l.kind}`}>
                {l.text}
                <CausedBy line={l} head={g.head} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** "por <card>": de qual efeito veio a consequência, quando nem a jogada nem o texto dizem. */
function CausedBy({ line, head }: { line: LogEntry; head: LogEntry }) {
  const id = line.source?.cardId;
  // A jogada que abre o grupo já diz o card: repetir em cada consequência só polui.
  if (!id || id === head.cardId || !cardExists(id)) return null;
  const name = card(id).name;
  return line.text.includes(name) ? null : <span className="log-by"> · por {name}</span>;
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
      <ScrollText size={20} aria-hidden />
      {unread > 0 && !showLog && <span className="log-fab-badge">{unread > 99 ? '99+' : unread}</span>}
    </Button>
  );
}
