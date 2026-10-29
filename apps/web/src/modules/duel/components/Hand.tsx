import { useDraggable } from '@dnd-kit/core';
import type { HandCardView } from '@devoh/engine';
import { AnimatePresence, m } from 'framer-motion';
import { useMediaQuery } from '../../../shared/lib/useMediaQuery';
import { CardMini } from '../../cards';
import { useDuel, useDuelUi } from '../hooks/useDuel';
import { useDuelActions } from '../hooks/useDuelActions';
import type { DragCard } from './HandDnd';

/** Mesma condição do bloco "celular deitado" no CSS do tabuleiro. */
const COMPACT_LANDSCAPE = '(orientation: landscape) and (max-height: 560px)';

/** Mão do jogador em leque (no celular deitado vira uma grade, sem leque). */
export function Hand() {
  const { me } = useDuel();
  const compact = useMediaQuery(COMPACT_LANDSCAPE);
  const n = me.hand?.length ?? 0;
  return (
    <div className="hand" data-tour="hand">
      <AnimatePresence initial={false}>
        {me.hand?.map((c, i) => (
          <HandCard key={c.iid} card={c} rotate={compact ? 0 : (i - (n - 1) / 2) * Math.min(5, 26 / n)} lift={compact ? -4 : -18} />
        ))}
      </AnimatePresence>
    </div>
  );
}

/** Card da mão: clique abre o painel; arrastar até uma zona do campo joga direto. */
function HandCard({ card, rotate, lift }: { card: HandCardView; rotate: number; lift: number }) {
  const { myTurn } = useDuel();
  const selected = useDuelUi((s) => s.sel?.iid === card.iid);
  const { clickZone } = useDuelActions();
  const playable = myTurn && (card.canSummon || card.canActivate || card.canSet);
  const drag = useDraggable({ id: card.iid, data: { card } satisfies DragCard, disabled: !playable });
  return (
    <m.button
      ref={drag.setNodeRef}
      {...drag.listeners}
      layout
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: drag.isDragging ? 0.35 : 1, rotate }}
      exit={{ y: -60, opacity: 0, scale: 0.8 }}
      whileHover={{ y: lift, rotate: 0, zIndex: 5 }}
      className={`hand-card ${playable ? 'playable' : ''} ${selected ? 'selected' : ''}`}
      onClick={() => clickZone('hand', card.iid, card.cardId)}
    >
      <CardMini cardId={card.cardId} />
    </m.button>
  );
}
