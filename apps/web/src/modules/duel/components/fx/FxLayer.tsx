import { card, type GameView, type Seat } from '@devoh/engine';
import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CardMini } from '../../../cards';
import { useDuel, useDuelUi } from '../../hooks/useDuel';
import { boardEvents, type BoardEvent } from '../../services/boardEvents';
import { Dice } from './Dice';
import { FlipCard } from './FlipCard';
import { Shield } from './Shield';
import { Swords } from './Swords';

type Side = 'me' | 'opp';
interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}
/** Evento pronto para tocar: com as posições já resolvidas (inclusive de cards que saíram do campo). */
interface Fx {
  id: number;
  ev: BoardEvent;
  side: Side;
  at?: Box;
  to?: Box;
}

/** Duração de cada efeito (ms): normal / movimento reduzido. 0 = só som, sem desenho. */
const DURATION: Record<BoardEvent['kind'], [number, number]> = {
  attack: [650, 200],
  hit: [380, 150],
  block: [700, 220],
  damage: [450, 150],
  heal: [450, 150],
  destroy: [720, 200],
  reveal: [1900, 500],
  flip: [1500, 400],
  activate: [1500, 400],
  summon: [0, 0],
  dice: [2500, 1200],
  set: [0, 0],
  turn: [0, 0],
  end: [500, 100],
};
/** Fila longa (ex.: voltando de uma queda): descarta o excesso para não ficar preso em animações velhas. */
const MAX_QUEUE = 16;
const CARD_BOX = { w: 92, h: 134 };

const boxOf = (el: Element | null): Box | undefined => {
  if (!el) return undefined;
  const r = el.getBoundingClientRect();
  return r.width ? { x: r.left, y: r.top, w: r.width, h: r.height } : undefined;
};
const center = (b: Box) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });
const hud = (side: Side) => boxOf(document.querySelector(`[data-hud="${side}"]`));
const grave = (side: Side) => boxOf(document.querySelector(`[data-grave="${side}"]`));

/** Treme um elemento do tabuleiro (Web Animations API: não depende de estado do React). */
function shake(el: Element | null | undefined, strength: number, ms: number) {
  el?.animate?.(
    [0, -1, 1, -0.7, 0.7, -0.3, 0].map((k) => ({ transform: `translateX(${k * strength}px)` })),
    { duration: ms, easing: 'ease-out' },
  );
}

/**
 * Camada de efeitos por cima do tabuleiro: a cada visão nova, transforma o que
 * aconteceu (log + diferenças) em uma fila e toca um efeito por vez.
 */
export function FxLayer({ onEvent }: { onEvent?: (ev: BoardEvent, you: Seat) => void }) {
  const { ctrl, view } = useDuel();
  const setFxBusy = useDuelUi((s) => s.setFxBusy);
  const reduced = !!useReducedMotion();
  const [queue, setQueue] = useState<Fx[]>([]);
  const nextId = useRef(1);
  const slots = useRef(new Map<string, Box>());
  const seen = useRef<{ view: GameView; lastId: number }>({ view, lastId: view.log.at(-1)?.id ?? 0 });

  // 1) Visão nova: vira eventos, com as posições anteriores (antes de atualizar o mapa abaixo).
  useLayoutEffect(() => {
    const prev = seen.current;
    if (prev.view !== view) {
      const sideOf = (seat: Seat): Side => (seat === view.you ? 'me' : 'opp');
      const fx = boardEvents(prev.view, view, prev.lastId).map((ev): Fx => {
        const side = 'seat' in ev ? sideOf(ev.seat) : 'me';
        const slot = (iid?: string) => (iid ? slots.current.get(iid) : undefined);
        switch (ev.kind) {
          case 'attack':
            return { id: nextId.current++, ev, side, at: slot(ev.target) ?? hud(sideOf(ev.seat === 0 ? 1 : 0)) };
          case 'hit':
          case 'block':
            return { id: nextId.current++, ev, side, at: slot(ev.target) ?? hud(side) };
          case 'destroy':
            return { id: nextId.current++, ev, side, at: slot(ev.iid), to: grave(side) };
          case 'reveal':
            // Bug Contínuo fica no campo: volta para a zona em vez do cemitério.
            return {
              id: nextId.current++,
              ev,
              side,
              at: slot(ev.iid),
              to: card(ev.cardId).bugType === 'continuous' ? slot(ev.iid) : grave(side),
            };
          case 'flip':
            // Vira no lugar, aparece em destaque e volta para a zona (continua no campo).
            return { id: nextId.current++, ev, side, at: slot(ev.iid), to: slot(ev.iid) };
          case 'activate':
            return { id: nextId.current++, ev, side, to: grave(side) };
          default:
            return { id: nextId.current++, ev, side };
        }
      });
      seen.current = { view, lastId: view.log.at(-1)?.id ?? prev.lastId };
      if (fx.length) setQueue((q) => [...q, ...fx].slice(-MAX_QUEUE));
    }
  }, [view]);

  // 2) A cada render, atualiza a posição das zonas ocupadas; as que esvaziaram guardam a última (para o "fantasma").
  useLayoutEffect(() => {
    document.querySelectorAll<HTMLElement>('.duel [data-slot-iid]').forEach((el) => {
      const b = boxOf(el);
      if (b) slots.current.set(el.dataset.slotIid!, b);
    });
  });

  const current = queue[0];
  const busy = queue.length > 0;
  useEffect(() => {
    setFxBusy(busy);
    ctrl.onFxBusyChange?.(busy);
  }, [busy]); // eslint-disable-line react-hooks/exhaustive-deps

  // Toca o efeito da vez: som, tremidas e, depois da duração, passa para o próximo.
  useEffect(() => {
    if (!current) return;
    const { ev, side, at } = current;
    onEvent?.(ev, view.you);
    const ms = DURATION[ev.kind][reduced ? 1 : 0];
    if (ev.kind === 'hit')
      shake(
        at && ev.target ? document.querySelector(`[data-slot-iid="${ev.target}"]`) : document.querySelector(`[data-hud="${side}"]`),
        9,
        ms,
      );
    if (ev.kind === 'block') shake(document.querySelector(`[data-hud="${side}"]`), 4, ms);
    if (ev.kind === 'damage') shake(document.querySelector(`[data-hud="${side}"]`), 7, ms);
    const t = setTimeout(() => setQueue((q) => q.slice(1)), ms);
    return () => clearTimeout(t);
  }, [current?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fx-layer" aria-hidden>
      <AnimatePresence>
        {current && DURATION[current.ev.kind][0] > 0 && <FxItem key={current.id} fx={current} reduced={reduced} />}
      </AnimatePresence>
    </div>
  );
}

function FxItem({ fx, reduced }: { fx: Fx; reduced: boolean }) {
  const { ev, side, at, to } = fx;
  const sec = DURATION[ev.kind][reduced ? 1 : 0] / 1000;
  switch (ev.kind) {
    case 'attack': {
      if (!at || reduced) return null;
      const c = center(at);
      const size = Math.max(90, Math.min(150, at.h * 1.1));
      return (
        <div className="fx-at" style={{ left: c.x - size / 2, top: c.y - size / 2 }}>
          <Swords size={size} duration={sec} />
        </div>
      );
    }
    case 'hit':
      return at ? (
        <div className="fx-at fx-box" style={{ left: at.x, top: at.y, width: at.w, height: at.h }}>
          <m.div className="fx-flash fx-flash-red" initial={{ opacity: 0.85 }} animate={{ opacity: 0 }} transition={{ duration: sec }} />
          {!reduced && (
            <m.div
              className="fx-slash"
              initial={{ scaleX: 0, opacity: 1 }}
              animate={{ scaleX: [0, 1.15, 1.15], opacity: [1, 1, 0] }}
              transition={{ duration: sec }}
            />
          )}
        </div>
      ) : null;
    case 'block': {
      if (!at) return null;
      const c = center(at);
      const size = Math.max(64, Math.min(120, at.h * 0.85));
      return (
        <div className="fx-at" style={{ left: c.x - size / 2, top: c.y - (size * 1.15) / 2 }}>
          <Shield size={size} duration={sec} />
        </div>
      );
    }
    case 'damage':
    case 'heal': {
      const b = hud(side);
      return b ? (
        <div className="fx-at fx-box" style={{ left: b.x, top: b.y, width: b.w, height: b.h }}>
          <m.div
            className={`fx-flash ${ev.kind === 'damage' ? 'fx-flash-red' : 'fx-flash-green'}`}
            initial={{ opacity: 0.7 }}
            animate={{ opacity: 0 }}
            transition={{ duration: sec }}
          />
        </div>
      ) : null;
    }
    case 'destroy':
      return at ? <Ghost cardId={ev.cardId} from={at} to={to} sec={sec} reduced={reduced} mode="shatter" /> : null;
    case 'reveal':
    case 'flip':
      return <Ghost cardId={ev.cardId} from={at} to={to} sec={sec} reduced={reduced} mode="reveal" side={side} />;
    case 'activate':
      // A sua própria Task você já viu sair da mão: o destaque é para a do oponente.
      return side === 'opp' ? <Ghost cardId={ev.cardId} to={to} sec={sec} reduced={reduced} mode="reveal-faceup" side={side} /> : null;
    case 'dice':
      return <Dice face={ev.face} bonus={ev.bonus} ok={ev.ok} side={side} sec={sec} reduced={reduced} />;
    case 'end':
      return <m.div className="fx-end" initial={{ opacity: 0 }} animate={{ opacity: [0, 0.5, 0] }} transition={{ duration: sec }} />;
    default:
      return null;
  }
}

/**
 * Card "fantasma" que continua o movimento de um card que já saiu do tabuleiro:
 * estilhaçar e ir para o cemitério, ou virar/aparecer em destaque no centro.
 */
function Ghost({
  cardId,
  from,
  to,
  sec,
  reduced,
  mode,
  side = 'me',
}: {
  cardId: string;
  from?: Box;
  to?: Box;
  sec: number;
  reduced: boolean;
  mode: 'shatter' | 'reveal' | 'reveal-faceup';
  side?: Side;
}) {
  const [revealed, setRevealed] = useState(mode !== 'reveal');
  useEffect(() => {
    if (mode !== 'reveal') return;
    const t = setTimeout(() => setRevealed(true), reduced ? 0 : 120);
    return () => clearTimeout(t);
  }, [mode, reduced]);

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  // Sem posição de origem (Task da mão do oponente): nasce no alto (oponente) ou embaixo (eu), no meio.
  const start: Box = from ?? { x: vw / 2 - CARD_BOX.w / 2, y: side === 'opp' ? -CARD_BOX.h : vh, ...CARD_BOX };
  const end = to ?? start;
  const big = Math.min(3, (vh * 0.42) / start.h, (vw * 0.6) / start.w);
  const dxCenter = vw / 2 - (start.x + start.w / 2);
  const dyCenter = vh / 2 - (start.y + start.h / 2);
  const dxEnd = end.x + end.w / 2 - (start.x + start.w / 2);
  const dyEnd = end.y + end.h / 2 - (start.y + start.h / 2);
  const box = { left: start.x, top: start.y, width: start.w, height: start.h };

  const card = <CardMini cardId={cardId} />;
  if (mode === 'shatter') {
    return (
      <m.div
        className="fx-ghost"
        style={box}
        initial={{ scale: 1, opacity: 1, filter: 'brightness(1)' }}
        animate={
          reduced
            ? { opacity: 0 }
            : {
                scale: [1, 1.15, 0.5],
                rotate: [0, -6, 18],
                x: [0, 0, dxEnd],
                y: [0, 0, dyEnd],
                opacity: [1, 1, 0],
                filter: ['brightness(1)', 'brightness(2.6)', 'brightness(1)'],
              }
        }
        transition={{ duration: sec, times: reduced ? undefined : [0, 0.35, 1] }}
      >
        {card}
        {!reduced && (
          <m.div className="fx-crack" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0] }} transition={{ duration: sec * 0.6 }} />
        )}
      </m.div>
    );
  }
  return (
    <m.div
      className="fx-ghost fx-ghost-reveal"
      style={box}
      initial={{ x: 0, y: 0, scale: mode === 'reveal' ? 1 : 0.6, opacity: mode === 'reveal' ? 1 : 0 }}
      animate={
        reduced
          ? { opacity: [1, 1, 0] }
          : {
              x: [0, dxCenter, dxCenter, dxEnd],
              y: [0, dyCenter, dyCenter, dyEnd],
              scale: [mode === 'reveal' ? 1 : 0.6, big, big, 0.4],
              opacity: [1, 1, 1, 0],
            }
      }
      transition={{ duration: sec, times: reduced ? undefined : [0, 0.28, 0.82, 1], ease: 'easeInOut' }}
    >
      <FlipCard revealed={revealed} back={<CardMini cardId={null} />} front={card} duration={reduced ? 0 : 0.35} />
    </m.div>
  );
}
