import { MAX_STRESS, START_LP, type HandCardView } from '@devoh/engine';
import { AnimatePresence, m } from 'framer-motion';
import { Archive, Hand, Layers, Zap } from 'lucide-react';
import { CardMini } from '../../cards';
import { useDuel, useDuelUi } from '../hooks/useDuel';
import { useLpDelta } from '../hooks/useLpDelta';

/** Barra do jogador: nome, LP (com variação animada), Estresse e contadores. */
export function PlayerHud({ side, active }: { side: 'me' | 'opp'; active: boolean }) {
  const { me, opp, spectator } = useDuel();
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
        {p.shocked && (
          <span className="chip chip-shock">
            <Zap size={12} aria-hidden /> Chocado
          </span>
        )}
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
        data-stress={side}
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
        <span title="Cards no deck">
          <Layers size={14} aria-hidden /> {p.deckCount}
        </span>
        <span title="Cards na mão">
          <Hand size={14} aria-hidden /> {p.handCount}
        </span>
        <span title="Desligados (cemitério)">
          <Archive size={14} aria-hidden /> {p.grave.length}
        </span>
      </div>
      {/* Quem assiste vê também a mão do jogador de cima (a de baixo fica no lugar de sempre). */}
      {spectator && side === 'opp' && p.hand && <OpenHand cards={p.hand} />}
    </div>
  );
}

/** Mão aberta em miniatura, só para olhar: clicar mostra o card no painel. */
function OpenHand({ cards }: { cards: HandCardView[] }) {
  const select = useDuelUi((s) => s.select);
  return (
    <div className="pbar-hand" aria-label="Mão do jogador de cima">
      {cards.map((c) => (
        <button key={c.iid} className="pbar-hand-card" onClick={() => select({ iid: c.iid, cardId: c.cardId, where: 'grave' })}>
          <CardMini cardId={c.cardId} />
        </button>
      ))}
    </div>
  );
}
