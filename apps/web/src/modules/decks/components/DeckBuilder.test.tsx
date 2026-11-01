import { card, DECK_MAX, STARTER_DECKS } from '@devoh/engine';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useDeckLibrary } from '../store/deckLibraryStore';
import { DeckBuilder } from './DeckBuilder';

afterEach(() => {
  cleanup();
  localStorage.clear();
  useDeckLibrary.setState({ custom: [] });
});

const deck = () => within(screen.getByRole('region', { name: 'Deck' }));
const trunk = () => within(screen.getByRole('region', { name: 'Cards disponíveis' }));
const detail = () => screen.getByRole('complementary', { name: 'Detalhes do card' });
const deckCount = () => document.querySelectorAll('.db-deck-grid .db-tile').length;
const tilesIn = (region: ReturnType<typeof deck>, name: string) => region.queryAllByRole('button', { name });

function emptyDeck() {
  render(<DeckBuilder />);
  fireEvent.click(deck().getByRole('button', { name: 'Limpar deck' }));
  fireEvent.click(screen.getByRole('button', { name: 'Limpar' }));
}

describe('deck builder', () => {
  it('começa com o deck inicial e o 1º card nos detalhes', () => {
    render(<DeckBuilder />);
    expect(deckCount()).toBe(STARTER_DECKS[0].cards.length);
    expect(detail().textContent).toContain(card(STARTER_DECKS[0].cards[0]).name);
  });

  it('clique esquerdo mostra o card nos detalhes sem mudar o deck', () => {
    render(<DeckBuilder />);
    const before = deckCount();
    const name = card('qa').name;
    fireEvent.click(trunk().getByRole('button', { name }));
    expect(detail().textContent).toContain(name);
    expect(deckCount()).toBe(before);
  });

  it('botão direito: do catálogo vai para o deck e do deck volta', () => {
    emptyDeck();
    const name = card('qa').name;
    fireEvent.contextMenu(trunk().getByRole('button', { name }));
    fireEvent.contextMenu(trunk().getByRole('button', { name }));
    expect(tilesIn(deck(), name)).toHaveLength(2);
    fireEvent.contextMenu(tilesIn(deck(), name)[0]);
    expect(tilesIn(deck(), name)).toHaveLength(1);
  });

  it('+1 e −1 no painel de detalhes, respeitando o limite de cópias', () => {
    emptyDeck();
    const name = card('qa').name;
    fireEvent.click(trunk().getByRole('button', { name }));
    const plus = screen.getByRole('button', { name: `Pôr ${name} no deck` });
    const minus = screen.getByRole('button', { name: `Tirar ${name} do deck` });
    expect((minus as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(plus);
    fireEvent.click(plus);
    fireEvent.click(plus);
    expect(tilesIn(deck(), name)).toHaveLength(3);
    expect((plus as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(minus);
    expect(tilesIn(deck(), name)).toHaveLength(2);
  });

  it('limpar pede confirmação; cancelar mantém e desfazer volta', () => {
    render(<DeckBuilder />);
    const before = deckCount();
    fireEvent.click(deck().getByRole('button', { name: 'Limpar deck' }));
    expect(screen.getByRole('alertdialog', { name: 'Limpar deck?' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(deckCount()).toBe(before);

    fireEvent.click(deck().getByRole('button', { name: 'Limpar deck' }));
    fireEvent.click(screen.getByRole('button', { name: 'Limpar' }));
    expect(deckCount()).toBe(0);
    fireEvent.click(deck().getByRole('button', { name: 'Desfazer' }));
    expect(deckCount()).toBe(before);
  });

  it('Auto monta um deck cheio', () => {
    emptyDeck();
    fireEvent.click(deck().getByRole('button', { name: 'Auto' }));
    expect(deckCount()).toBe(DECK_MAX);
  });

  it('busca filtra o catálogo', () => {
    render(<DeckBuilder />);
    const name = card('qa').name;
    fireEvent.change(trunk().getByRole('searchbox', { name: 'Buscar cards' }), { target: { value: name } });
    expect(trunk().getByRole('button', { name })).toBeTruthy();
    fireEvent.change(trunk().getByRole('searchbox', { name: 'Buscar cards' }), { target: { value: 'zzzz-nada' } });
    expect(trunk().getByText('Nenhum card com esses filtros.')).toBeTruthy();
  });

  it('clicar na carta do painel amplia; clicar fora ou Esc fecha', () => {
    render(<DeckBuilder />);
    const name = card('qa').name;
    fireEvent.click(trunk().getByRole('button', { name }));
    fireEvent.click(screen.getByRole('button', { name: `Ampliar ${name}` }));
    const zoom = screen.getByRole('dialog', { name: `${name} ampliada` });

    // Clicar na própria carta não fecha.
    fireEvent.click(zoom.querySelector('.card-full')!);
    expect(screen.queryByRole('dialog', { name: `${name} ampliada` })).not.toBeNull();

    // Clicar fora fecha.
    fireEvent.click(zoom);
    expect(screen.queryByRole('dialog')).toBeNull();

    // Como num clique de verdade, o botão recebe o foco antes de abrir.
    const open = screen.getByRole('button', { name: `Ampliar ${name}` });
    open.focus();
    fireEvent.click(open);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(open);
  });

  it('aba Decks: abre um deck inicial e mostra qual está em edição', () => {
    render(<DeckBuilder />);
    fireEvent.click(screen.getByRole('tab', { name: 'Decks' }));
    const starters = within(screen.getByRole('region', { name: 'Decks iniciais' }));
    const target = STARTER_DECKS.at(-1)!;
    fireEvent.click(starters.getByRole('button', { name: `Abrir ${target.name}` }));
    expect((screen.getByRole('textbox', { name: 'Nome do deck' }) as HTMLInputElement).value).toBe(target.name);
    expect(deckCount()).toBe(target.cards.length);
    expect(starters.getByRole('button', { name: `Abrir ${target.name}` }).getAttribute('aria-current')).toBe('true');
    expect(screen.getByRole('region', { name: 'Meus decks' }).textContent).toContain('ainda não salvou');
  });

  it('com alterações não salvas, trocar de deck pede confirmação', () => {
    render(<DeckBuilder />);
    fireEvent.contextMenu(trunk().getAllByRole('button', { name: card('qa').name })[0]);
    fireEvent.click(screen.getByRole('tab', { name: 'Decks' }));
    const target = STARTER_DECKS.at(-1)!;
    const open = () => fireEvent.click(screen.getByRole('button', { name: `Abrir ${target.name}` }));
    const name = () => (screen.getByRole('textbox', { name: 'Nome do deck' }) as HTMLInputElement).value;
    const before = name();

    open();
    expect(screen.getByRole('alertdialog', { name: 'Trocar de deck?' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(name()).toBe(before);

    open();
    fireEvent.click(screen.getByRole('button', { name: 'Trocar' }));
    expect(name()).toBe(target.name);
  });

  it('dá para esconder os decks iniciais, e a escolha fica salva', () => {
    render(<DeckBuilder />);
    fireEvent.click(screen.getByRole('tab', { name: 'Decks' }));
    fireEvent.click(screen.getByRole('switch', { name: 'Mostrar decks iniciais' }));
    expect(screen.queryByRole('region', { name: 'Decks iniciais' })).toBeNull();
    cleanup();
    render(<DeckBuilder />);
    fireEvent.click(screen.getByRole('tab', { name: 'Decks' }));
    expect(screen.queryByRole('region', { name: 'Decks iniciais' })).toBeNull();
  });

  it('a busca do catálogo continua depois de ir e voltar da aba Decks', () => {
    render(<DeckBuilder />);
    fireEvent.change(trunk().getByRole('searchbox', { name: 'Buscar cards' }), { target: { value: 'qa' } });
    fireEvent.click(screen.getByRole('tab', { name: 'Decks' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Cards' }));
    expect((trunk().getByRole('searchbox', { name: 'Buscar cards' }) as HTMLInputElement).value).toBe('qa');
  });

  it('excluir deck pede confirmação: cancelar mantém, confirmar apaga', async () => {
    const mine = { id: 'custom-teste', name: 'Deck Salvo', description: '', cards: [...STARTER_DECKS[0].cards] };
    const remove = vi.fn(async (id: string) => useDeckLibrary.setState((s) => ({ custom: s.custom.filter((d) => d.id !== id) })));
    useDeckLibrary.setState({ custom: [mine], remove });
    render(<DeckBuilder />);
    fireEvent.click(screen.getByRole('tab', { name: 'Decks' }));
    fireEvent.click(screen.getByRole('button', { name: 'Abrir Deck Salvo' }));
    // Nome no campo editado: a confirmação mostra o nome salvo.
    fireEvent.change(screen.getByRole('textbox', { name: 'Nome do deck' }), { target: { value: 'Rascunho' } });

    fireEvent.click(deck().getByRole('button', { name: 'Excluir' }));
    const dialog = screen.getByRole('alertdialog', { name: 'Excluir deck?' });
    expect(dialog.textContent).toContain('Deck Salvo');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    expect(remove).not.toHaveBeenCalled();

    fireEvent.click(deck().getByRole('button', { name: 'Excluir' }));
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Excluir' }));
    expect(remove).toHaveBeenCalledWith('custom-teste');
    expect(await screen.findByText('Você ainda não salvou nenhum deck.')).toBeTruthy();
  });
});
