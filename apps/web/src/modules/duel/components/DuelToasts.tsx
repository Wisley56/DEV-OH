import { AnimatePresence, m } from 'framer-motion';
import { useDuelUi } from '../hooks/useDuel';

/** Aviso de jogada recusada. O que acontece no duelo é contado pela faixa de narração (FxLayer). */
export function DuelToasts() {
  const error = useDuelUi((s) => s.error);
  return (
    <div className="toasts" aria-live="polite">
      <AnimatePresence>
        {error && (
          <m.div key="err" className="toast toast-error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {error}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
