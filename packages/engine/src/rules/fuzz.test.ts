import { describe, expect, it } from 'vitest';
import { applyAction, createGame, validateDeck } from '../index';
import type { Seat } from '../core/types';
import { checkInvariants, prng, randomAction, randomDeck } from '../testing/fuzz';

/**
 * Fuzz: jogadas aleatórias (válidas, inválidas e de quem não está na vez) com
 * decks aleatórios. O engine nunca pode lançar exceção, alterar o estado
 * recebido nem quebrar invariantes — no servidor, isso seria um crash por payload.
 */
describe('fuzz do engine', () => {
  it('aguenta milhares de jogadas aleatórias sem exceção nem corrupção', () => {
    let applied = 0;
    for (let g = 0; g < 40; g++) {
      const rand = prng(1000 + g);
      const decks = [randomDeck(rand), randomDeck(rand)];
      decks.forEach((d) => expect(validateDeck(d)).toEqual([]));
      let s = createGame({
        players: [
          { name: 'A', deck: decks[0] },
          { name: 'B', deck: decks[1] },
        ],
        seed: g,
        first: (g % 2) as Seat,
      });
      for (let step = 0; step < 400 && s.winner === null; step++) {
        const seat: Seat = rand() < 0.85 ? s.active : ((1 - s.active) as Seat);
        const action = randomAction(s, rand);
        const before = JSON.stringify(s);
        const r = applyAction(s, seat, action);
        expect(JSON.stringify(s), 'applyAction alterou o estado recebido').toBe(before);
        if (!r.ok) {
          expect(typeof r.error).toBe('string');
          continue;
        }
        applied++;
        s = r.state;
        checkInvariants(s);
      }
    }
    expect(applied).toBeGreaterThan(1000);
    // Leva ~2 s sozinho; com os outros pacotes rodando em paralelo, mais.
  }, 60_000);
});
