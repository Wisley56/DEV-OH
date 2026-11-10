import type { LogEntry } from '@devoh/engine';

/** Uma jogada no histórico: a linha que a abre e o que ela causou. */
export interface LogGroup {
  head: LogEntry;
  rest: LogEntry[];
}

/**
 * Agrupa o histórico por jogada (`act`): a primeira linha é a jogada e as outras são as
 * consequências. A virada de turno abre um grupo novo, mesmo vindo da mesma jogada (o "passar a vez").
 */
export function groupLog(log: readonly LogEntry[]): LogGroup[] {
  const groups: LogGroup[] = [];
  let act: number | undefined;
  for (const l of log) {
    const cur = groups.at(-1);
    if (!cur || l.act === undefined || l.act !== act || l.kind === 'turn') groups.push({ head: l, rest: [] });
    else cur.rest.push(l);
    act = l.act;
  }
  return groups;
}
