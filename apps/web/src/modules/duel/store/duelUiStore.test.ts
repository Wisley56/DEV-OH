import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDuelUiStore } from './duelUiStore';

describe('estado de interface do duelo', () => {
  afterEach(() => vi.useRealTimers());

  it('selecionar fecha o histórico; entrar num modo fecha a seleção', () => {
    const s = createDuelUiStore(5);
    s.getState().toggleLog();
    expect(s.getState().showLog).toBe(true);
    s.getState().select({ iid: 'c1', cardId: 'qa', where: 'hand' });
    expect(s.getState()).toMatchObject({ showLog: false, sel: { iid: 'c1' } });
    s.getState().setMode({ kind: 'attack', iid: 'c1' });
    expect(s.getState().sel).toBeNull();
    s.getState().setMode(null);
    expect(s.getState().mode).toBeNull();
  });

  it('erro de jogada some sozinho', () => {
    vi.useFakeTimers();
    const s = createDuelUiStore(0);
    s.getState().flashError('Não é o seu turno.');
    expect(s.getState().error).toBe('Não é o seu turno.');
    vi.advanceTimersByTime(2600);
    expect(s.getState().error).toBeNull();
  });

  it('começa com o log atual já lido', () => {
    expect(createDuelUiStore(42).getState().seenLogId).toBe(42);
  });
});
