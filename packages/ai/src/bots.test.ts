import { applyAction, createGame, STARTER_DECKS, type Seat } from '@devoh/engine';
import { describe, expect, it } from 'vitest';
import { botAction } from './index';

describe('bot difícil (Sem IA)', () => {
  it('só faz jogadas legais e vence o bot normal na maioria', () => {
    let hardWins = 0;
    // Amostra grande: com 30 partidas o resultado oscila ±10% só pelo sorteio das seeds.
    const N = 100;
    for (let seed = 1; seed <= N; seed++) {
      const hardSeat: Seat = seed % 2 === 0 ? 0 : 1;
      const decks = [STARTER_DECKS[seed % 3], STARTER_DECKS[(seed + 1) % 3]];
      let s = createGame({
        players: [
          { name: 'A', deck: decks[0].cards },
          { name: 'B', deck: decks[1].cards },
        ],
        seed,
      });
      for (let steps = 0; s.winner === null && steps < 3000; steps++) {
        const a = botAction(s, s.active, s.active === hardSeat ? 'hard' : 'normal');
        const r = applyAction(s, s.active, a);
        if (!r.ok) throw new Error(`seed ${seed}: ação ilegal ${JSON.stringify(a)}: ${r.error}`);
        s = r.state;
      }
      expect(s.winner, `seed ${seed} não terminou`).not.toBeNull();
      if (s.winner === hardSeat) hardWins++;
    }
    expect(hardWins / N).toBeGreaterThan(0.55);
  }, 180_000);
});

describe('bot vs bot', () => {
  it('partidas terminam sem erro com todos os decks', () => {
    const n = STARTER_DECKS.length;
    let finished = 0;
    for (let seed = 1; seed <= 80; seed++) {
      const d0 = STARTER_DECKS[seed % n];
      const d1 = STARTER_DECKS[(seed + 1 + Math.floor(seed / n)) % n];
      let s = createGame({
        players: [
          { name: 'Bot A', deck: d0.cards },
          { name: 'Bot B', deck: d1.cards },
        ],
        seed,
      });
      let steps = 0;
      while (s.winner === null && steps < 3000) {
        const seat = s.active;
        const a = botAction(s, seat);
        const r = applyAction(s, seat, a);
        if (!r.ok) throw new Error(`seed ${seed}: bot fez ação ilegal ${JSON.stringify(a)}: ${r.error}`);
        s = r.state;
        steps++;
      }
      expect(s.winner, `seed ${seed} não terminou`).not.toBeNull();
      finished++;
    }
    expect(finished).toBe(80);
  }, 60_000);
});
