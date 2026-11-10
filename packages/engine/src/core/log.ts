import { MAX_LOG } from './constants';
import type { GameState, LogEntry, LogKind, LogSource, Seat } from './types';

/**
 * Efeitos resolvendo agora, do mais antigo para o mais novo. Só existe durante uma chamada
 * síncrona das regras (não vai para o estado): serve para o log dizer qual card causou cada linha.
 */
const causes: LogSource[] = [];

/** Roda `fn` com `source` como causa das linhas de log escritas lá dentro. */
export function withCause<T>(source: LogSource, fn: () => T): T {
  causes.push(source);
  try {
    return fn();
  } finally {
    causes.pop();
  }
}

export function log(s: GameState, kind: LogKind, text: string, extra: Partial<LogEntry> = {}) {
  const source = extra.source ?? causes.at(-1);
  s.log.push({ id: s.nextLogId++, kind, text, ...extra, ...(source && { source }), ...(s.actionSeq && { act: s.actionSeq }) });
  if (s.log.length > MAX_LOG) s.log.splice(0, s.log.length - MAX_LOG);
}

export const pname = (s: GameState, seat: Seat) => s.players[seat].name;
