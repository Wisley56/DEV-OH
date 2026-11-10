import type { LogEntry } from '@devoh/engine';
import { describe, expect, it } from 'vitest';
import { groupLog } from './logGroups';

const line = (id: number, kind: LogEntry['kind'], act?: number): LogEntry => ({ id, kind, text: `linha ${id}`, ...(act && { act }) });

describe('histórico por jogada', () => {
  it('junta as consequências embaixo da jogada', () => {
    const groups = groupLog([line(1, 'task', 1), line(2, 'stress', 1), line(3, 'heal', 1), line(4, 'attack', 2), line(5, 'damage', 2)]);
    expect(groups.map((g) => [g.head.id, g.rest.map((l) => l.id)])).toEqual([
      [1, [2, 3]],
      [4, [5]],
    ]);
  });

  it('a virada de turno abre um grupo novo dentro da mesma jogada', () => {
    const groups = groupLog([line(1, 'effect', 3), line(2, 'turn', 3), line(3, 'draw', 3)]);
    expect(groups.map((g) => [g.head.id, g.rest.map((l) => l.id)])).toEqual([
      [1, []],
      [2, [3]],
    ]);
  });

  it('linha sem jogada (início do duelo) fica sozinha', () => {
    const groups = groupLog([line(1, 'info'), line(2, 'turn'), line(3, 'summon', 1)]);
    expect(groups.map((g) => g.head.id)).toEqual([1, 2, 3]);
  });
});
