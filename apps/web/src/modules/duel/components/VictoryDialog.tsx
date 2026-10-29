import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '../../../shared/ui';
import { useDuel } from '../hooks/useDuel';
import { winnerText } from '../services/interaction';

/** Resultado do duelo, com revanche e volta ao menu. */
export function VictoryDialog() {
  const { ctrl, view } = useDuel();
  const text = winnerText(view);
  return (
    <AnimatePresence>
      {text && (
        <motion.div className="victory" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <motion.div className="victory-box" initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={{ type: 'spring', bounce: 0.4 }}>
            <h2 className={view.winner === view.you ? 'win' : 'lose'}>{text}</h2>
            <p>{view.log.filter((l) => l.kind === 'win').at(-1)?.text}</p>
            <div className="victory-actions">
              {ctrl.rematch && (
                <Button variant="primary" onClick={ctrl.rematch}>
                  {ctrl.rematchLabel ?? 'Revanche'}
                </Button>
              )}
              <Button onClick={ctrl.exit}>Voltar ao menu</Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
