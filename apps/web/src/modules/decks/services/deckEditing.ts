import { card, cardList, DECK_MAX, maxCopies, STARTER_DECKS, type DeckList } from '@devoh/engine';

/** Regras de edição de deck no deck builder (funções puras). */

const KIND_ORDER = { pro: 0, task: 1, bug: 2 } as const;

export function countCards(cards: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const id of cards) m.set(id, (m.get(id) ?? 0) + 1);
  return m;
}

export const isStarterDeck = (id: string) => STARTER_DECKS.some((d) => d.id === id);

export function canAdd(cards: string[], cardId: string): boolean {
  const n = cards.filter((x) => x === cardId).length;
  return n < maxCopies(cardId) && cards.length < DECK_MAX;
}

export function addCard(deck: DeckList, cardId: string): DeckList {
  return canAdd(deck.cards, cardId) ? { ...deck, cards: [...deck.cards, cardId] } : deck;
}

export function removeCard(deck: DeckList, cardId: string): DeckList {
  const i = deck.cards.lastIndexOf(cardId);
  return i < 0 ? deck : { ...deck, cards: deck.cards.filter((_, j) => j !== i) };
}

/** Novo deck personalizado copiando as cartas de `base`. */
export function newDeckFrom(base: DeckList, existing: number, now = Date.now()): DeckList {
  return {
    id: `custom-${now.toString(36)}`,
    name: `Meu deck ${existing + 1}`,
    description: `Deck personalizado (base: ${base.name}).`,
    cards: [...base.cards],
  };
}

/** Entradas [cardId, quantidade]: Profissionais, Tasks e Bugs; maior nível primeiro. */
export function sortedEntries(cards: string[]): [string, number][] {
  return [...countCards(cards).entries()].sort(
    ([a], [b]) => KIND_ORDER[card(a).kind] - KIND_ORDER[card(b).kind] || (card(b).level ?? 0) - (card(a).level ?? 0),
  );
}

/** Cartas de um deck aleatório e válido com `DECK_MAX` cards (botão Auto). */
export function randomDeck(rng: () => number = Math.random): string[] {
  const pool = cardList().map((c) => c.id);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const cards: string[] = [];
  // Percorre o catálogo embaralhado pondo 1..máx cópias de cada card até encher.
  while (cards.length < DECK_MAX) {
    const before = cards.length;
    for (const id of pool) {
      const copies = 1 + Math.floor(rng() * maxCopies(id));
      for (let k = 0; k < copies && canAdd(cards, id); k++) cards.push(id);
      if (cards.length >= DECK_MAX) break;
    }
    if (cards.length === before) break;
  }
  return cards;
}

/** Card da capa do deck: o primeiro na ordem do deck (Profissional de maior nível). */
export function coverCard(cards: string[]): string | null {
  return sortedEntries(cards)[0]?.[0] ?? null;
}
