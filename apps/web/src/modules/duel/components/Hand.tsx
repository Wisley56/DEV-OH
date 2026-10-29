import { AnimatePresence, motion } from 'framer-motion';
import { useMediaQuery } from '../../../shared/lib/useMediaQuery';
import { CardMini } from '../../cards';
import { useDuel, useDuelUi } from '../hooks/useDuel';
import { useDuelActions } from '../hooks/useDuelActions';

/** Mesma condição do bloco "celular deitado" no CSS do tabuleiro. */
const COMPACT_LANDSCAPE = '(orientation: landscape) and (max-height: 560px)';

/** Mão do jogador em leque (no celular deitado vira uma grade, sem leque). */
export function Hand() {
  const { me, myTurn } = useDuel();
  const selected = useDuelUi((s) => s.sel?.iid);
  const { clickZone } = useDuelActions();
  const compact = useMediaQuery(COMPACT_LANDSCAPE);
  const n = me.hand?.length ?? 0;
  return (
    <div className="hand">
      <AnimatePresence initial={false}>
        {me.hand?.map((c, i) => {
          const playable = c.canSummon || c.canActivate || c.canSet;
          const rot = compact ? 0 : (i - (n - 1) / 2) * Math.min(5, 26 / n);
          return (
            <motion.button
              key={c.iid}
              layout
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1, rotate: rot }}
              exit={{ y: -60, opacity: 0, scale: 0.8 }}
              whileHover={{ y: compact ? -4 : -18, rotate: 0, zIndex: 5 }}
              className={`hand-card ${playable && myTurn ? 'playable' : ''} ${selected === c.iid ? 'selected' : ''}`}
              onClick={() => clickZone('hand', c.iid, c.cardId)}
            >
              <CardMini cardId={c.cardId} />
            </motion.button>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
