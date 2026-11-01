import { launchGhost, prepareGhost } from '../services/cardFlight';
import { useDeckBuilderApi } from '../store/deckBuilderStore';

const esc = (id: string) => (typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(id) : id);
const trunkTile = (id: string) => document.querySelector<HTMLElement>(`.db-trunk-grid [data-card="${esc(id)}"]`);
const deckTiles = (id: string) => document.querySelectorAll<HTMLElement>(`.db-deck-grid [data-card="${esc(id)}"]`);
const lastDeckTile = (id: string) => [...deckTiles(id)].at(-1) ?? null;

/**
 * Põe/tira um card do deck animando o voo entre o catálogo e o deck.
 * `source` é o elemento de onde o card sai (padrão: o card no catálogo ao pôr, a última cópia no deck ao tirar).
 */
export function useMoveCard() {
  const store = useDeckBuilderApi();
  return (cardId: string, dir: 'add' | 'remove', source?: Element | null) => {
    const before = store.getState().editing.cards;
    const ghost = prepareGhost(source ?? (dir === 'add' ? trunkTile(cardId) : lastDeckTile(cardId)));
    if (dir === 'add') store.getState().addCard(cardId);
    else store.getState().removeCard(cardId);
    if (!ghost || store.getState().editing.cards === before) return;
    // Depois que o React aplicou a mudança (antes de pintar): o destino já existe na tela.
    requestAnimationFrame(() => {
      if (dir === 'add') {
        launchGhost(ghost, lastDeckTile(cardId), { hideTarget: true, fallbackArea: document.querySelector('.db-deck-grid') });
      } else {
        launchGhost(ghost, trunkTile(cardId), { fallbackArea: document.querySelector('.db-trunk-grid') });
      }
    });
  };
}
