import { DECK_MAX, STARTER_DECKS, validateDeck } from '@devoh/engine';
import { describe, expect, it, vi } from 'vitest';
import { createDeckBuilderStore, HISTORY_LIMIT } from './deckBuilderStore';
import { useDeckLibrary } from './deckLibraryStore';

const fresh = () => {
  const store = createDeckBuilderStore(() => 0.5);
  store.getState().open(STARTER_DECKS[0]);
  return store;
};

describe('deck builder: desfazer, limpar e auto', () => {
  it('desfaz adicionar e remover na ordem inversa', () => {
    const store = fresh();
    const start = store.getState().editing.cards;
    store.getState().clear();
    store.getState().addCard('qa');
    store.getState().addCard('qa');
    store.getState().removeCard('qa');
    expect(store.getState().editing.cards).toEqual(['qa']);
    store.getState().undo();
    expect(store.getState().editing.cards).toEqual(['qa', 'qa']);
    store.getState().undo();
    store.getState().undo();
    expect(store.getState().editing.cards).toEqual([]);
    store.getState().undo();
    expect(store.getState().editing.cards).toEqual(start);
    expect(store.getState().history).toEqual([]);
  });

  it('ação sem efeito não entra no histórico', () => {
    const store = fresh();
    store.getState().removeCard('nao_existe');
    store.getState().clear();
    store.getState().clear();
    expect(store.getState().history).toHaveLength(1);
  });

  it('auto gera um deck válido e pode ser desfeito', () => {
    const store = fresh();
    const start = store.getState().editing.cards;
    store.getState().autoFill();
    const cards = store.getState().editing.cards;
    expect(cards).toHaveLength(DECK_MAX);
    expect(validateDeck(cards)).toEqual([]);
    store.getState().undo();
    expect(store.getState().editing.cards).toEqual(start);
  });

  it('desfazer mantém o nome; abrir outro deck zera o histórico', () => {
    const store = fresh();
    store.getState().clear();
    store.getState().rename('Novo nome');
    store.getState().undo();
    expect(store.getState().editing.name).toBe('Novo nome');
    store.getState().clear();
    store.getState().open(STARTER_DECKS[1] ?? STARTER_DECKS[0]);
    expect(store.getState().history).toEqual([]);
  });

  it('guarda no máximo HISTORY_LIMIT versões', () => {
    const store = fresh();
    for (let i = 0; i < HISTORY_LIMIT + 10; i++) store.getState().autoFill();
    expect(store.getState().history.length).toBeLessThanOrEqual(HISTORY_LIMIT);
  });
});

describe('deck builder: alterações não salvas e salvar deck inicial', () => {
  const mockSave = () => {
    const save = vi.fn(async () => {});
    useDeckLibrary.setState({ save });
    return save;
  };

  it('marca alterações em cartas e nome; abrir ou salvar limpa', async () => {
    mockSave();
    const store = fresh();
    expect(store.getState().dirty).toBe(false);
    store.getState().removeCard('nao_existe');
    expect(store.getState().dirty).toBe(false);
    store.getState().clear();
    expect(store.getState().dirty).toBe(true);
    store.getState().open(STARTER_DECKS[0]);
    expect(store.getState().dirty).toBe(false);
    store.getState().rename('Outro');
    expect(store.getState().dirty).toBe(true);
    await store.getState().save();
    expect(store.getState().dirty).toBe(false);
  });

  it('salvar deck inicial renomeado mantém o nome escolhido', async () => {
    const save = mockSave();
    const store = fresh();
    store.getState().rename('Deck Tech');
    await store.getState().save();
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ name: 'Deck Tech' }));
    expect(store.getState().editing.id).not.toBe(STARTER_DECKS[0].id);
  });

  it('salvar deck inicial sem renomear usa "Meu deck N"', async () => {
    const save = mockSave();
    const store = fresh();
    await store.getState().save();
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ name: expect.stringMatching(/^Meu deck \d+$/) }));
  });
});
