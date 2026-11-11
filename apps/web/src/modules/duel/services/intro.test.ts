import { applyAction, createGame, getSpectatorView, getView, STARTER_DECKS } from '@devoh/engine';
import { describe, expect, it } from 'vitest';
import { isDuelStart } from './intro';

const game = () =>
  createGame({
    players: [
      { name: 'Ana', deck: STARTER_DECKS[0].cards },
      { name: 'Bia', deck: STARTER_DECKS[1].cards },
    ],
    seed: 3,
    first: 0,
  });

describe('abertura do duelo', () => {
  it('aparece no começo, para os dois lados e para quem assiste', () => {
    const s = game();
    expect(isDuelStart(getView(s, 0))).toBe(true);
    expect(isDuelStart(getView(s, 1))).toBe(true);
    expect(isDuelStart(getSpectatorView(s))).toBe(true);
  });

  it('não aparece depois da primeira jogada nem com o duelo acabado', () => {
    const played = applyAction(game(), 0, { type: 'endTurn' });
    expect(played.ok && isDuelStart(getView(played.state, 1))).toBe(false);
    const over = applyAction(game(), 0, { type: 'surrender' });
    expect(over.ok && isDuelStart(getView(over.state, 0))).toBe(false);
  });
});
