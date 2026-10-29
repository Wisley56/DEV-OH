import { AnimatePresence, m } from 'framer-motion';
import { useDuel, useDuelUi } from '../hooks/useDuel';
import { useLogToasts } from '../hooks/useLogToasts';

/** Notificações dos acontecimentos do duelo e dos erros de jogada. */
export function DuelToasts() {
  const { view } = useDuel();
  const error = useDuelUi((s) => s.error);
  const toasts = useLogToasts(view.log);
  return (
    <div className="toasts" aria-live="polite">
      <AnimatePresence>
        {toasts.map((t) => (
          <m.div
            key={t.id}
            className={`toast toast-${t.kind} ${t.seat === view.you ? 'from-me' : 'from-opp'}`}
            initial={{ opacity: 0, y: -16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            {t.text}
          </m.div>
        ))}
        {error && (
          <m.div key="err" className="toast toast-error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {error}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
