import { m } from 'framer-motion';
import type { ReactNode } from 'react';

/**
 * Carta que vira em 3D: mostra `back` (verso) e, com `revealed`, gira para mostrar `front`.
 * Mesma ideia do react-card-flip, mas com framer-motion (já usado no tabuleiro).
 */
export function FlipCard({
  front,
  back,
  revealed,
  duration = 0.45,
}: {
  front: ReactNode;
  back: ReactNode;
  revealed: boolean;
  duration?: number;
}) {
  return (
    <div className="flip-card">
      <m.div className="flip-inner" initial={false} animate={{ rotateY: revealed ? 180 : 0 }} transition={{ duration, ease: 'easeInOut' }}>
        <div className="flip-face flip-back">{back}</div>
        <div className="flip-face flip-front">{front}</div>
      </m.div>
    </div>
  );
}
