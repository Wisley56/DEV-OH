import { CARD_LIST, MAX_COPIES, maxCopies } from '@devoh/engine';
import { useMemo } from 'react';
import { CardMini } from '../../cards';
import { countCards } from '../services/deckEditing';
import { useDeckBuilder } from '../store/deckBuilderStore';

/** Todos os cards do jogo; clique adiciona ao deck em edição. */
export function CardPool() {
  const cards = useDeckBuilder((s) => s.editing.cards);
  const addCard = useDeckBuilder((s) => s.addCard);
  const setPreview = useDeckBuilder((s) => s.setPreview);
  const counts = useMemo(() => countCards(cards), [cards]);
  return (
    <section className="db-pool">
      <p className="muted">Clique para adicionar · pessoas da squad: 1 cópia · demais: até {MAX_COPIES}</p>
      <div className="pool-grid">
        {CARD_LIST.map((c) => {
          const n = counts.get(c.id) ?? 0;
          return (
            <button
              key={c.id}
              className={`pool-card ${n >= maxCopies(c.id) ? 'maxed' : ''}`}
              onClick={() => addCard(c.id)}
              onMouseEnter={() => setPreview(c.id)}
              onFocus={() => setPreview(c.id)}
            >
              <CardMini cardId={c.id} badge={n ? <span className="badge count">{n}</span> : undefined} />
            </button>
          );
        })}
      </div>
    </section>
  );
}
