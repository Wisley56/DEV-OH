import { cardList, card, maxCopies, type CardDef, type CardKind, type Rarity } from '@devoh/engine';

/** Gerador pseudoaleatório com seed (mulberry32): o mesmo seed gera os mesmos decks. */
export function seededRng(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const GENERATED_DECK_SIZE = 30;

/** Composição parecida com a dos decks iniciais (15–19 Profissionais, 7–11 Tasks, 3–5 Bugs). */
const QUOTA: Record<CardKind, number> = { pro: 16, task: 9, bug: 5 };
/** Teto de Profissionais que pedem sacrifício, para o bot conseguir invocar alguma coisa. */
const MAX_TWO_TRIBUTES = 2; // nível 7+
const MAX_ONE_TRIBUTE = 4; // nível 5–6

/** Cards comuns aparecem mais, como num deck montado de verdade. */
const RARITY_WEIGHT: Record<Rarity, number> = { comum: 3, rara: 2, super: 1.5, ultra: 1, secreta: 0.7 };

const tier = (c: CardDef) => (c.kind !== 'pro' ? 0 : (c.level ?? 1) >= 7 ? 2 : (c.level ?? 1) >= 5 ? 1 : 0);

/**
 * Deck válido de 30 cards. Os cards de `focus` entram primeiro (1 cópia cada);
 * o resto é sorteado por tipo, com peso por raridade e respeitando as cópias permitidas.
 */
export function generateDeck(rng: () => number, focus: readonly string[] = [], pool: readonly CardDef[] = cardList()): string[] {
  const counts = new Map<string, number>();
  const byKind: Record<CardKind, number> = { pro: 0, task: 0, bug: 0 };
  const tiers = [0, 0, 0];
  const deck: string[] = [];
  const add = (c: CardDef) => {
    deck.push(c.id);
    counts.set(c.id, (counts.get(c.id) ?? 0) + 1);
    byKind[c.kind]++;
    tiers[tier(c)]++;
  };
  const fits = (c: CardDef) =>
    (counts.get(c.id) ?? 0) < maxCopies(c.id) &&
    (tier(c) !== 2 || tiers[2] < MAX_TWO_TRIBUTES) &&
    (tier(c) !== 1 || tiers[1] < MAX_ONE_TRIBUTE);

  for (const id of focus) if (!counts.has(id)) add(card(id));

  const pick = (candidates: CardDef[]) => {
    const total = candidates.reduce((n, c) => n + RARITY_WEIGHT[c.rarity], 0);
    let r = rng() * total;
    for (const c of candidates) if ((r -= RARITY_WEIGHT[c.rarity]) < 0) return c;
    return candidates[candidates.length - 1];
  };

  for (const kind of ['pro', 'task', 'bug'] as CardKind[]) {
    while (byKind[kind] < QUOTA[kind] && deck.length < GENERATED_DECK_SIZE) {
      const candidates = pool.filter((c) => c.kind === kind && fits(c));
      if (!candidates.length) break;
      add(pick(candidates));
    }
  }
  // Faltou card de algum tipo (pool pequeno): completa com qualquer um que caiba.
  while (deck.length < GENERATED_DECK_SIZE) {
    const candidates = pool.filter(fits);
    if (!candidates.length) break;
    add(pick(candidates));
  }
  return deck;
}

/**
 * Entrega os cards foco em rodízio: cada volta embaralha o catálogo inteiro,
 * então todos os cards aparecem o mesmo número de vezes (±1).
 */
export function focusRotation(rng: () => number, ids: readonly string[] = cardList().map((c) => c.id)) {
  const queue: string[] = [];
  const refill = () => {
    const next = [...ids];
    for (let i = next.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [next[i], next[j]] = [next[j], next[i]];
    }
    queue.push(...next);
  };
  return (n: number): string[] => {
    const out: string[] = [];
    while (out.length < n) {
      if (!queue.length) refill();
      const id = queue.shift()!;
      // Repetido nesta mão: volta para o fim da fila.
      if (out.includes(id)) {
        if (queue.every((q) => out.includes(q))) refill();
        queue.push(id);
        continue;
      }
      out.push(id);
    }
    return out;
  };
}
