import { CARD_LIST, maxCopies, RARITY_INFO } from '@devoh/engine';
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
      <p className="muted">Clique para adicionar · pessoas da squad, Ultra e Secreta: 1 cópia · Super: 2 · demais: 3</p>
      <div className="pool-grid">
        {CARD_LIST.map((c) => {
          const n = counts.get(c.id) ?? 0;
          const max = maxCopies(c.id);
          return (
            <button
              key={c.id}
              title={`${c.name} · ${RARITY_INFO[c.rarity].label} · máx. ${max}`}
              className={`pool-card ${n >= max ? 'maxed' : ''}`}
              onClick={() => addCard(c.id)}
              onMouseEnter={() => setPreview(c.id)}
              onFocus={() => setPreview(c.id)}
            >
              <CardMini cardId={c.id} badge={n ? <span className="badge count">{max > 1 ? `${n}/${max}` : n}</span> : undefined} />
            </button>
          );
        })}
      </div>
    </section>
  );
}
