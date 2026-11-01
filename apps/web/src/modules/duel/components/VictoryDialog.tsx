import { AnimatePresence, m } from 'framer-motion';
import { Bug, ClipboardList, Coins, Flame, HeartPulse, Sparkles, Swords, Trash2, Zap, type LucideIcon } from 'lucide-react';
import { Button } from '../../../shared/ui';
import { CardMini } from '../../cards';
import { useDuel, useDuelUi } from '../hooks/useDuel';
import { duelSummary } from '../services/duelSummary';

const STEP_ICON: Partial<Record<string, LucideIcon>> = {
  attack: Swords,
  damage: Flame,
  heal: HeartPulse,
  destroy: Trash2,
  bug: Bug,
  task: ClipboardList,
  summon: Sparkles,
  effect: Zap,
  coin: Coins,
  stress: Flame,
};

function StepIcon({ kind, size }: { kind: string; size: number }) {
  const Icon = STEP_ICON[kind];
  return Icon ? <Icon size={size} aria-hidden /> : <span aria-hidden>•</span>;
}

/** Resultado do duelo: por que acabou, como terminou (último turno), revanche e volta ao menu. */
export function VictoryDialog() {
  const { ctrl, view } = useDuel();
  // Espera as animações do último lance terminarem antes de cobrir o tabuleiro.
  const fxBusy = useDuelUi((s) => s.fxBusy);
  const sum = fxBusy ? null : duelSummary(view);
  return (
    <AnimatePresence>
      {sum && (
        <m.div className="victory" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <m.div className="victory-box" initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={{ type: 'spring', bounce: 0.4 }}>
            <h2 className={sum.tone === 'win' ? 'win' : 'lose'}>{sum.title}</h2>
            <p className="victory-headline">{sum.headline}</p>
            <p className="victory-lp">
              LP final: <b>você {sum.lp.me}</b> · oponente {sum.lp.opp}
            </p>
            {ctrl.resultNote && <p className="victory-note">{ctrl.resultNote}</p>}
            {sum.steps.length > 0 && (
              <div className="victory-story">
                <h3>Como terminou</h3>
                <ol>
                  {sum.steps.map((st) => (
                    <li key={st.id} className={`vs-step vs-${st.kind} ${st.side ? `from-${st.side}` : ''}`}>
                      <span className="vs-thumb">
                        {st.cardId ? (
                          <CardMini cardId={st.cardId} />
                        ) : (
                          <span className="vs-icon">
                            <StepIcon kind={st.kind} size={20} />
                          </span>
                        )}
                      </span>
                      <span className="vs-text">
                        {st.cardId && STEP_ICON[st.kind] && <StepIcon kind={st.kind} size={14} />}
                        {st.text}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            <div className="victory-actions">
              {ctrl.rematch && (
                <Button variant="primary" onClick={ctrl.rematch}>
                  {ctrl.rematchLabel ?? 'Revanche'}
                </Button>
              )}
              <Button variant={ctrl.rematch ? undefined : 'primary'} onClick={ctrl.exit}>
                {ctrl.exitLabel ?? 'Voltar ao menu'}
              </Button>
            </div>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
