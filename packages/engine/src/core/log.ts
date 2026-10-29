import { MAX_LOG } from './constants';
import type { GameState, LogEntry, LogKind, Seat } from './types';

export function log(s: GameState, kind: LogKind, text: string, extra: Partial<LogEntry> = {}) {
  s.log.push({ id: s.nextLogId++, kind, text, ...extra });
  if (s.log.length > MAX_LOG) s.log.splice(0, s.log.length - MAX_LOG);
}

export const pname = (s: GameState, seat: Seat) => s.players[seat].name;
