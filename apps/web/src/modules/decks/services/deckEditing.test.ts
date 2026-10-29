import { DECK_MAX, STARTER_DECKS } from '@devoh/engine';
import { describe, expect, it } from 'vitest';
import { addCard, canAdd, isStarterDeck, newDeckFrom, removeCard, sortedEntries } from './deckEditing';

const base = STARTER_DECKS[0];

describe('edição de deck', () => {
  it('respeita cópias por card e o tamanho máximo', () => {
    expect(canAdd(['wisley'], 'wisley')).toBe(false);
    expect(canAdd(['qa', 'qa'], 'qa')).toBe(true);
    expect(canAdd(['qa', 'qa', 'qa'], 'qa')).toBe(false);
    expect(canAdd(Array(DECK_MAX).fill('cafe'), 'qa')).toBe(false);
  });

  it('adicionar/remover devolve o mesmo deck quando nada muda', () => {
    const d = newDeckFrom(base, 0, 1);
    expect(addCard(d, 'thy_revisor')).toBe(d);
    expect(removeCard(d, 'nao_existe')).toBe(d);
    expect(removeCard(addCard(d, 'qa'), 'qa').cards).toEqual(d.cards);
  });

  it('novo deck copia a base e não é inicial', () => {
    const d = newDeckFrom(base, 2, 36);
    expect(d).toMatchObject({ id: 'custom-10', name: 'Meu deck 3', description: `Deck personalizado (base: ${base.name}).` });
    expect(d.cards).not.toBe(base.cards);
    expect(isStarterDeck(d.id)).toBe(false);
    expect(isStarterDeck(base.id)).toBe(true);
  });

  it('ordena Profissionais, Tasks e Bugs; maior nível primeiro', () => {
    const kinds = sortedEntries(['merge_conflict', 'cafe', 'vitor', 'thy_revisor', 'cafe']);
    expect(kinds).toEqual([
      ['thy_revisor', 1],
      ['vitor', 1],
      ['cafe', 2],
      ['merge_conflict', 1],
    ]);
  });
});
