import { BASE_CARD_LIST, card, installCustomCards, validateDeck } from '@devoh/engine';
import { afterEach, describe, expect, it } from 'vitest';
import { focusRotation, generateDeck, GENERATED_DECK_SIZE, seededRng } from './deckGen';
import { reportsToMarkdown } from './markdown';
import { createBalanceRun, runBalance, type BalanceConfig } from './simulate';
import { verdictOf, wilson } from './stats';

afterEach(() => {
  installCustomCards([]);
});

describe('decks gerados', () => {
  it('são sempre válidos, com curva de nível jogável', () => {
    const rng = seededRng(42);
    const next = focusRotation(rng);
    for (let i = 0; i < 500; i++) {
      const focus = next(3);
      const deck = generateDeck(rng, focus);
      expect(validateDeck(deck), deck.join(',')).toEqual([]);
      expect(deck).toHaveLength(GENERATED_DECK_SIZE);
      for (const id of focus) expect(deck).toContain(id);
      const high = deck.filter((id) => card(id).kind === 'pro' && (card(id).level ?? 1) >= 7);
      // Até 2 de nível 7+ sorteados, mais os que vieram como foco.
      expect(high.length).toBeLessThanOrEqual(2 + focus.length);
    }
  });

  it('o rodízio de foco passa por todos os cards antes de repetir', () => {
    const next = focusRotation(seededRng(1));
    const seen = new Set<string>();
    for (let i = 0; i < Math.ceil(BASE_CARD_LIST.length / 3); i++) next(3).forEach((id) => seen.add(id));
    expect(seen.size).toBe(BASE_CARD_LIST.length);
  });

  it('mesmo seed, mesmos decks', () => {
    expect(generateDeck(seededRng(7), ['ceo'])).toEqual(generateDeck(seededRng(7), ['ceo']));
  });
});

describe('estatística', () => {
  it('intervalo de Wilson contém a taxa e fica em 0–1', () => {
    const [lo, hi] = wilson({ games: 50, wins: 30 })!;
    expect(lo).toBeLessThan(0.6);
    expect(hi).toBeGreaterThan(0.6);
    expect(wilson({ games: 3, wins: 3 })![1]).toBeLessThanOrEqual(1);
    expect(wilson({ games: 0, wins: 0 })).toBeNull();
  });

  it('veredito só sai com amostra e diferença claras', () => {
    expect(verdictOf({ games: 10, wins: 10 })).toBe('poucos-dados');
    expect(verdictOf({ games: 200, wins: 140 })).toBe('nerf');
    expect(verdictOf({ games: 200, wins: 60 })).toBe('buff');
    expect(verdictOf({ games: 200, wins: 104 })).toBe('ok');
  });
});

describe('simulação', () => {
  const small: BalanceConfig = { mode: 'both', gamesPerMatchup: 2, minGamesPerCard: 5, levels: ['normal', 'normal'], seed: 3 };

  it('com foco, testa só o card pedido (o rascunho do criador de cartas)', () => {
    installCustomCards([
      {
        serial: 1,
        artVersion: 1,
        status: 'published',
        input: {
          id: 'x_rascunho',
          name: 'Rascunho',
          kind: 'pro',
          rarity: 'comum',
          typeLine: 'Humano / Teste',
          attribute: 'TECH',
          level: 4,
          atk: 1800,
          def: 1000,
          effects: [{ when: 'summon', do: [{ do: 'stress', side: 'opp', amount: 2 }] }],
        },
      },
    ]);
    const r = runBalance({ ...small, mode: 'random', focus: ['x_rascunho'] });
    const x = r.cards.find((c) => c.id === 'x_rascunho')!;
    expect(x.included.games).toBeGreaterThanOrEqual(small.minGamesPerCard);
    expect(r.totals.generatedGames).toBeLessThan(small.minGamesPerCard * 3);
  }, 120_000);

  it('decks gerados colocam todo card do catálogo em partidas', () => {
    const r = runBalance({ ...small, mode: 'random' });
    expect(r.matchups).toBeNull();
    for (const c of r.cards) expect(c.included.games, c.id).toBeGreaterThanOrEqual(5);
    expect(r.totals.games).toBe(r.totals.generatedGames);
  }, 120_000);

  it('é determinística e soma os confrontos dos dois lados', () => {
    const a = runBalance(small);
    const b = runBalance(small);
    expect({ ...a, startedAt: '', durationMs: 0 }).toEqual({ ...b, startedAt: '', durationMs: 0 });
    const { wins, games } = a.matchups!;
    for (let i = 0; i < games.length; i++)
      for (let j = 0; j < games.length; j++) {
        expect(games[i][j]).toBe(games[j][i]);
        expect(wins[i][j] + wins[j][i]).toBeLessThanOrEqual(games[i][j]);
      }
    expect(a.totals.starterGames).toBe(games.length * (games.length - 1) * small.gamesPerMatchup);
    expect(reportsToMarkdown([a])).toContain('# Balanceamento DEV-OH!');
    // O relatório vai por postMessage e por JSON: sem Map/Set.
    expect(JSON.parse(JSON.stringify(a))).toEqual(a);
  }, 120_000);

  it('passo a passo: pode parar no meio e gerar relatório parcial', () => {
    const run = createBalanceRun(small);
    for (let i = 0; i < 5; i++) run.step();
    const r = run.report(true);
    expect(run.done).toBe(5);
    expect(r.cancelled).toBe(true);
    expect(r.totals.games).toBe(5);
  }, 60_000);
});
