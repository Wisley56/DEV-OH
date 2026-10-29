import type { LogEntry } from '@devoh/engine';
import { useEffect, useMemo, useRef, useState } from 'react';

const TOAST_KINDS = new Set(['bug', 'effect', 'coin', 'stress', 'summon', 'task', 'attack', 'destroy']);

/** Mostra as entradas novas do log como notificações temporárias. Dados rolados ficam de fora: a animação mostra o resultado. */
export function useLogToasts(log: LogEntry[]) {
  const [items, setItems] = useState<LogEntry[]>([]);
  const lastId = useRef<number | null>(null);
  const fresh = useMemo(() => {
    if (lastId.current === null) return [];
    return log.filter(
      (l) => l.id > lastId.current! && TOAST_KINDS.has(l.kind) && !(l.kind === 'stress' && !l.text.includes('limite')) && !l.roll,
    );
  }, [log]);
  useEffect(() => {
    lastId.current = log.at(-1)?.id ?? 0;
    if (!fresh.length) return;
    const add = fresh.slice(-4);
    setItems((cur) => [...cur, ...add].slice(-4));
    const ids = new Set(add.map((a) => a.id));
    // Sem cleanup de propósito: cada lote some sozinho mesmo se o log mudar antes.
    setTimeout(() => setItems((cur) => cur.filter((x) => !ids.has(x.id))), 3200);
  }, [log]); // eslint-disable-line react-hooks/exhaustive-deps
  return items;
}
