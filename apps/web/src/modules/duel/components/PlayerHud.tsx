import { MAX_STRESS, START_LP } from '@devoh/engine';
import { AnimatePresence, m } from 'framer-motion';
import { useDuel } from '../hooks/useDuel';
import { useLpDelta } from '../hooks/useLpDelta';

/** Barra do jogador: nome, LP (com variação animada), Estresse e contadores. */
export function PlayerHud({ side, active }: { side: 'me' | 'opp'; active: boolean }) {
  const { me, opp } = useDuel();
  const p = side === 'me' ? me : opp;
  const delta = useLpDelta(p.lp);
  const lpPct = Math.max(0, Math.min(100, (p.lp / START_LP) * 100));
  return (
    <div
      className={`pbar ${side === 'opp' ? 'top' : ''} ${active ? 'active' : ''}`}
      data-hud={side}
      data-tour={side === 'me' ? 'hud' : undefined}
    >
      <div className="pbar-name">
        {p.name}
        {p.shocked && <span className="chip chip-shock">😱 Chocado</span>}
      </div>
      <div className="lp">
        <div className="lp-label">
          LP <b>{p.lp}</b>
        </div>
        <div className="lp-track">
          <m.div className="lp-fill" animate={{ width: `${lpPct}%` }} transition={{ duration: 0.6 }} />
        </div>
        <AnimatePresence>
          {delta && (
            <m.span
              key={delta.k}
              className={`lp-delta ${delta.v < 0 ? 'neg' : 'pos'}`}
              initial={{ opacity: 0, y: 0 }}
              animate={{ opacity: 1, y: -22 }}
              exit={{ opacity: 0 }}
            >
              {delta.v > 0 ? '+' : ''}
              {delta.v}
            </m.span>
          )}
        </AnimatePresence>
      </div>
      <div
        className="stress"
        title={`Estresse ${p.stress}/${MAX_STRESS}: cada ponto dá +100 ATK aos Profissionais. No ${MAX_STRESS}, o de maior nível pede demissão e o Estresse zera.`}
      >
        <span className="stress-label">Estresse</span>
        <div className="stress-pips">
          {Array.from({ length: MAX_STRESS }, (_, i) => (
            <span key={i} className={`pip ${i < p.stress ? 'on' : ''} ${i >= MAX_STRESS - 2 ? 'danger' : ''}`} />
          ))}
        </div>
      </div>
      <div className="pbar-counts">
        <span title="Cards no deck">🂠 {p.deckCount}</span>
        <span title="Cards na mão">✋ {p.handCount}</span>
        <span title="Desligados (cemitério)">🪦 {p.grave.length}</span>
      </div>
    </div>
  );
}
