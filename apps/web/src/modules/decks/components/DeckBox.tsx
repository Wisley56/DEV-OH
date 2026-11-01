import { card, DECK_MAX, type DeckList } from '@devoh/engine';
import { Layers } from 'lucide-react';
import type { CSSProperties } from 'react';
import { ATTR, CardArt } from '../../cards';
import { coverCard } from '../services/deckEditing';

const KIND_COLOR = { pro: '#c46a2b', task: '#1b8a6b', bug: '#b23a7a' } as const;

/** Deckbox: caixa com a arte do card principal na capa e o nome embaixo. */
export function DeckBox({ deck, current, onOpen }: { deck: DeckList; current: boolean; onOpen(): void }) {
  const cover = coverCard(deck.cards);
  const d = cover ? card(cover) : null;
  const color = d ? (d.attribute ? ATTR[d.attribute].color : KIND_COLOR[d.kind]) : '#34437a';
  return (
    <button
      type="button"
      className={`db-deckbox ${current ? 'current' : ''}`}
      aria-label={`Abrir ${deck.name}`}
      aria-current={current || undefined}
      title={current ? `${deck.name} (em edição)` : deck.name}
      onClick={onOpen}
    >
      <span className="deckbox" style={{ '--box': color } as CSSProperties} aria-hidden>
        <span className="deckbox-window">{d ? <CardArt def={d} /> : <Layers size={28} />}</span>
      </span>
      <span className="db-deckbox-name">{deck.name}</span>
      <span className="db-deckbox-count mono">
        {deck.cards.length}/{DECK_MAX}
      </span>
    </button>
  );
}
