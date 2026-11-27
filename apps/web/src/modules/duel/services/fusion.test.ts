import { applyAction, createGame, getView, MOCORONGO_PIECES, STARTER_DECKS, type GameState } from '@devoh/engine';
import { describe, expect, it } from 'vitest';
import { boardEvents } from './boardEvents';
import { duelSummary } from './duelSummary';
import { cardActions } from './interaction';

const FUSION = 'mocorongo_fusao';

/** Duelo com as 5 peças dos Devs Mocorongos na mão da Ana (assento 0), no turno dela. */
function withPieces(): GameState {
  const s = createGame({
    players: [
      { name: 'Ana', deck: STARTER_DECKS[0].cards },
      { name: 'Bia', deck: STARTER_DECKS[1].cards },
    ],
    seed: 3,
    first: 0,
  });
  MOCORONGO_PIECES.forEach((cardId, i) => s.players[0].hand.push({ iid: `moc${i}`, cardId, owner: 0 }));
  return s;
}

describe('fusão Devs Mocorongos no tabuleiro', () => {
  it('peça selecionada mostra o botão de reunir o time primeiro', () => {
    const v = getView(withPieces(), 0);
    const { actions } = cardActions(v, { iid: 'moc0', cardId: 'mocorongo_thy', where: 'hand' });
    expect(actions[0]).toEqual({ label: 'Reunir os Devs Mocorongos!', primary: true, intent: { kind: 'fusion', fusionId: FUSION } });
  });

  it('sem todas as peças, nada de botão', () => {
    const s = withPieces();
    s.players[0].hand.pop();
    const { actions } = cardActions(getView(s, 0), { iid: 'moc0', cardId: 'mocorongo_thy', where: 'hand' });
    expect(actions.some((a) => a.intent.kind === 'fusion')).toBe(false);
  });

  it('a fusão vira um evento próprio e o resumo explica a vitória', () => {
    const before = withPieces();
    const r = applyAction(before, 0, { type: 'fusion', fusionId: FUSION });
    if (!r.ok) throw new Error(r.error);
    const prev = getView(before, 1);
    const next = getView(r.state, 1);
    const evs = boardEvents(prev, next, prev.log.at(-1)?.id ?? 0);
    expect(evs.find((e) => e.kind === 'fusion')).toMatchObject({ kind: 'fusion', seat: 0, cardId: FUSION, pieces: [...MOCORONGO_PIECES] });
    expect(evs.at(-1)?.kind).toBe('end');
    expect(duelSummary(getView(r.state, 0))).toMatchObject({ tone: 'win' });
    expect(duelSummary(next)?.headline).toContain('Ana reuniu os Devs Mocorongos');
  });
});
