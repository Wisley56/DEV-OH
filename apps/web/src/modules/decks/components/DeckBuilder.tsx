import { useState } from 'react';
import { PageHead } from '../../../shared/ui';
import { createDeckBuilderStore, DeckBuilderContext } from '../store/deckBuilderStore';
import { CardPool } from './CardPool';
import { DeckPanel } from './DeckPanel';
import { DeckPicker } from './DeckPicker';

/** Deck builder completo: escolher base, adicionar/remover cards, salvar. */
export function DeckBuilder() {
  const [store] = useState(createDeckBuilderStore);
  return (
    <DeckBuilderContext.Provider value={store}>
      <PageHead title="Montar deck">
        <DeckPicker />
      </PageHead>
      <div className="db-layout">
        <CardPool />
        <DeckPanel />
      </div>
    </DeckBuilderContext.Provider>
  );
}
