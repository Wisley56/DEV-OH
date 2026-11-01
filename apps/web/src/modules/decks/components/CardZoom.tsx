import { card } from '@devoh/engine';
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { CardFull } from '../../cards';

/**
 * Carta ampliada por cima da tela. Clicar fora da carta ou apertar Esc fecha;
 * ao fechar, o foco volta para quem abriu.
 */
export function CardZoom({ cardId, onClose }: { cardId: string; onClose(): void }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    const back = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close.current();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      back?.focus?.();
    };
  }, []);

  // No body: fica acima de tudo, fora do contexto de empilhamento do painel.
  return createPortal(
    <div
      ref={dialogRef}
      className="card-zoom"
      role="dialog"
      aria-modal="true"
      aria-label={`${card(cardId).name} ampliada`}
      tabIndex={-1}
      onClick={(e) => {
        // Só fecha clicando fora da carta.
        if (!(e.target as Element).closest('.card-zoom-card')) onClose();
      }}
    >
      <div className="card-zoom-card">
        <CardFull cardId={cardId} />
      </div>
      <p className="card-zoom-hint">Clique fora da carta ou aperte Esc para fechar</p>
    </div>,
    document.body,
  );
}
