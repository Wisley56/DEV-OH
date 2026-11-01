import { card, RARITY_INFO } from '@devoh/engine';
import type { KeyboardEvent, ReactNode } from 'react';
import { CardMini } from '../../cards';
import { useDeckBuilder } from '../store/deckBuilderStore';
import { useMoveCard } from '../hooks/useMoveCard';

/**
 * Card clicável do deck builder.
 * Clique: mostra no painel de detalhes · botão direito: `rightClick` (tirar do deck ou pôr no deck).
 * Teclado: Enter mostra · `+` adiciona · `-`/Delete remove.
 */
export function CardTile({
  cardId,
  rightClick,
  badge,
  className = '',
}: {
  cardId: string;
  rightClick: 'add' | 'remove';
  badge?: ReactNode;
  className?: string;
}) {
  const selected = useDeckBuilder((s) => s.preview === cardId);
  const setPreview = useDeckBuilder((s) => s.setPreview);
  const move = useMoveCard();
  const { name, rarity } = card(cardId);
  const r = RARITY_INFO[rarity];

  const onKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    // O voo sai deste card quando ele é a origem natural (catálogo ao pôr, deck ao tirar).
    const inTrunk = rightClick === 'add';
    if (e.key === '+' || e.key === '=') move(cardId, 'add', inTrunk ? e.currentTarget : null);
    else if (e.key === '-' || e.key === 'Delete' || e.key === 'Backspace') move(cardId, 'remove', inTrunk ? null : e.currentTarget);
    else return;
    e.preventDefault();
    setPreview(cardId);
  };

  return (
    <button
      type="button"
      className={`db-tile ${selected ? 'selected' : ''} ${className}`}
      data-card={cardId}
      aria-label={name}
      aria-pressed={selected}
      title={`${name} · ${r.label} · clique: detalhes · botão direito: ${rightClick === 'add' ? 'pôr no deck' : 'tirar do deck'}`}
      onClick={() => setPreview(cardId)}
      onContextMenu={(e) => {
        e.preventDefault();
        move(cardId, rightClick, e.currentTarget);
        setPreview(cardId);
      }}
      onKeyDown={onKey}
    >
      <CardMini cardId={cardId} badge={badge} />
      <span className={`db-rarity-tag rarity-${rarity}`} aria-hidden>
        {r.short}
      </span>
    </button>
  );
}
