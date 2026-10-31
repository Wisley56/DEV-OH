import { describe, expect, it } from 'vitest';
import { eloDelta } from './elo.js';

describe('eloDelta', () => {
  it('iguais: vitória vale 16, empate 0', () => {
    expect(eloDelta(1000, 1000, 1)).toEqual([16, -16]);
    expect(eloDelta(1000, 1000, 0)).toEqual([-16, 16]);
    expect(eloDelta(1000, 1000, 0.5)).toEqual([0, -0]);
  });

  it('zebra rende mais que vitória esperada', () => {
    const [upset] = eloDelta(1000, 1400, 1);
    const [expected] = eloDelta(1400, 1000, 1);
    expect(upset).toBe(29);
    expect(expected).toBe(3);
  });
});
