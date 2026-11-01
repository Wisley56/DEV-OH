import { useState } from 'react';
import { createDeckBuilderStore, DeckBuilderContext } from '../store/deckBuilderStore';
import { CardDetailPanel } from './CardDetailPanel';
import { CardTrunk } from './CardTrunk';
import { DeckGrid } from './DeckGrid';

/** Deck builder: detalhes do card · deck em edição · catálogo de cards e lista de decks. */
export function DeckBuilder() {
  const [store] = useState(() => createDeckBuilderStore());
  return (
    <DeckBuilderContext.Provider value={store}>
      <h1 className="sr-only">Montar deck</h1>
      <div className="db-layout">
        <CardDetailPanel />
        <DeckGrid />
        <CardTrunk />
      </div>
    </DeckBuilderContext.Provider>
  );
}
