import { card, type GameView, type Seat } from '@devoh/engine';
import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import { FastForward } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CardMini } from '../../../cards';
import { useDuel, useDuelUi } from '../../hooks/useDuel';
import { boardEvents, type BoardEvent } from '../../services/boardEvents';
import { Dice } from './Dice';
import { FlipCard } from './FlipCard';
import { FloatNumber, Link, Pulse, Stamp, type Box } from './Marks';
import { Shield } from './Shield';
import { Swords } from './Swords';

type Side = 'me' | 'opp';

/** Evento pronto para tocar: com as posições já resolvidas (inclusive de cards que saíram do campo). */
interface Fx {
  id: number;
  ev: BoardEvent;
  side: Side;
  at?: Box;
  to?: Box;
  /** Onde está o card que causou o efeito: dali sai o traço até o que foi afetado. */
  from?: Box;
  /** Posição de cada item dos eventos em grupo (ATK/DEF, anulação, posição). */
  boxes?: (Box | undefined)[];
}

interface Caption {
  id: number;
  text: string;
  cardId?: string;
  side: Side;
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
  effect: [1300, 700],
  stress: [450, 150],
  meltdown: [1600, 800],
  bounce: [900, 400],
  stat: [1100, 600],
  negate: [1000, 500],
  position: [750, 350],
};
/** Tempo mínimo de um efeito causado por um card: dá para ler a legenda e ver de onde veio. */
const TOLD_MS: [number, number] = [1150, 700];
/** A legenda só troca em efeitos que ficam na tela tempo bastante para ler. */
const CAPTION_MIN_MS = 600;
/** Fila longa (ex.: voltando de uma queda): descarta o excesso para não ficar preso em animações velhas. */
const MAX_QUEUE = 24;
/** Com mais do que isso na fila aparece o botão de pular. */
const SKIP_FROM = 3;
const CARD_BOX = { w: 92, h: 134 };

function durationOf({ ev, side }: Fx, reduced: boolean): number {
  const i = reduced ? 1 : 0;
  let ms = DURATION[ev.kind][i];
  // A sua invocação e a sua Task você viu sair da mão; as do oponente ganham um instante de legenda.
  if (ev.kind === 'summon' && side === 'opp') ms = [700, 400][i];
  if (ev.kind === 'activate' && side === 'me') ms = [800, 400][i];
  if (ev.caption && ev.source) ms = Math.max(ms, TOLD_MS[i]);
  return ms;
}

const boxOf = (el: Element | null): Box | undefined => {
  if (!el) return undefined;
  const r = el.getBoundingClientRect();
  return r.width ? { x: r.left, y: r.top, w: r.width, h: r.height } : undefined;
};
const center = (b: Box) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });
const hud = (side: Side) => boxOf(document.querySelector(`[data-hud="${side}"]`));
const grave = (side: Side) => boxOf(document.querySelector(`[data-grave="${side}"]`));
const stressMeter = (side: Side) => boxOf(document.querySelector(`[data-stress="${side}"]`)) ?? hud(side);
/** Para onde um card "volta para a mão": a mão de baixo, ou o HUD do oponente. */
const handOf = (side: Side) => (side === 'me' ? (boxOf(document.querySelector('.duel .hand')) ?? hud(side)) : hud(side));

/** Treme um elemento do tabuleiro (Web Animations API: não depende de estado do React). */
function shake(el: Element | null | undefined, strength: number, ms: number) {
  el?.animate?.(
    [0, -1, 1, -0.7, 0.7, -0.3, 0].map((k) => ({ transform: `translateX(${k * strength}px)` })),
    { duration: ms, easing: 'ease-out' },
  );
}

/**
 * Camada de efeitos por cima do tabuleiro: a cada visão nova, transforma o que
 * aconteceu (log + diferenças) em uma fila e toca um efeito por vez. A faixa de
 * narração acompanha o efeito da vez: diz o que houve e mostra o card que causou.
 */
export function FxLayer({ onEvent }: { onEvent?: (ev: BoardEvent, you: Seat) => void }) {
  const { ctrl, view } = useDuel();
  const setFxBusy = useDuelUi((s) => s.setFxBusy);
  const reduced = !!useReducedMotion();
  const [queue, setQueue] = useState<Fx[]>([]);
  const [caption, setCaption] = useState<Caption | null>(null);
  const nextId = useRef(1);
  const slots = useRef(new Map<string, Box>());
  const seen = useRef<{ view: GameView; lastId: number }>({ view, lastId: view.log.at(-1)?.id ?? 0 });

  // 1) Visão nova: vira eventos, com as posições anteriores (antes de atualizar o mapa abaixo).
  useLayoutEffect(() => {
    const prev = seen.current;
    if (prev.view !== view) {
      const sideOf = (seat: Seat): Side => (seat === view.you ? 'me' : 'opp');
      const slot = (iid?: string) => (iid ? slots.current.get(iid) : undefined);
      const fx = boardEvents(prev.view, view, prev.lastId).map((ev): Fx => {
        const side = 'seat' in ev ? sideOf(ev.seat) : 'me';
        const base = { id: nextId.current++, ev, side, from: slot(ev.source?.iid) };
        switch (ev.kind) {
          case 'attack':
            return { ...base, at: slot(ev.target) ?? hud(sideOf(ev.seat === 0 ? 1 : 0)) };
          case 'hit':
          case 'block':
            return { ...base, at: slot(ev.target) ?? hud(side) };
          case 'damage':
          case 'heal':
          case 'meltdown':
            return { ...base, at: hud(side) };
          case 'stress':
            return { ...base, at: stressMeter(side) };
          case 'destroy':
            return { ...base, at: slot(ev.iid), to: grave(side) };
          case 'reveal':
            // Bug Contínuo fica no campo: volta para a zona em vez do cemitério.
            return { ...base, at: slot(ev.iid), to: card(ev.cardId).bugType === 'continuous' ? slot(ev.iid) : grave(side) };
          case 'flip':
            // Vira no lugar, aparece em destaque e volta para a zona (continua no campo).
            return { ...base, at: slot(ev.iid), to: slot(ev.iid) };
          case 'activate':
            return { ...base, at: slot(ev.target), to: grave(side) };
          case 'bounce':
            return { ...base, at: slot(ev.iid), to: handOf(side) };
          case 'effect':
            // O alvo, quando há; senão o próprio card que causou pulsa.
            return { ...base, at: slot(ev.target) ?? base.from };
          case 'stat':
          case 'negate':
          case 'position':
            return { ...base, boxes: ev.items.map((x) => slot(x.iid)) };
          default:
            return base;
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
  const intro = useDuelUi((s) => s.intro);
  const busy = queue.length > 0 || intro;
  useEffect(() => {
    setFxBusy(busy);
    ctrl.onFxBusyChange?.(busy);
    if (!busy) setCaption(null);
  }, [busy]); // eslint-disable-line react-hooks/exhaustive-deps

  // Toca o efeito da vez: som, legenda, tremidas e, depois da duração, passa para o próximo.
  useEffect(() => {
    if (!current) return;
    const { ev, side, at } = current;
    onEvent?.(ev, view.you);
    const ms = durationOf(current, reduced);
    if (ev.caption && ms >= CAPTION_MIN_MS) {
      setCaption({ id: current.id, text: ev.caption, cardId: ev.source?.cardId ?? ('cardId' in ev ? ev.cardId : undefined), side });
    }
    if (ev.kind === 'hit')
      shake(
        at && ev.target ? document.querySelector(`[data-slot-iid="${ev.target}"]`) : document.querySelector(`[data-hud="${side}"]`),
        9,
        ms,
      );
    if (ev.kind === 'block') shake(document.querySelector(`[data-hud="${side}"]`), 4, ms);
    if (ev.kind === 'damage') shake(document.querySelector(`[data-hud="${side}"]`), 7, ms);
    if (ev.kind === 'meltdown') shake(document.querySelector(`[data-hud="${side}"]`), 12, ms);
    if (ev.kind === 'stress') shake(document.querySelector(`[data-stress="${side}"]`), 3, ms);
    const t = setTimeout(() => setQueue((q) => q.slice(1)), ms);
    return () => clearTimeout(t);
  }, [current?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const ms = current ? durationOf(current, reduced) : 0;
  return (
    <div className="fx-layer" aria-hidden>
      <AnimatePresence>{current && ms > 0 && <FxItem key={current.id} fx={current} sec={ms / 1000} reduced={reduced} />}</AnimatePresence>
      <AnimatePresence>
        {caption && (
          <m.div
            key="caption"
            className={`fx-caption from-${caption.side}`}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
          >
            {caption.cardId && <CardMini cardId={caption.cardId} className="fx-caption-card" />}
            <span key={caption.id} className="fx-caption-text">
              {caption.text}
            </span>
          </m.div>
        )}
      </AnimatePresence>
      {queue.length >= SKIP_FROM && (
        <button className="fx-skip" onClick={() => setQueue([])} tabIndex={-1}>
          <FastForward size={14} aria-hidden /> Pular animações
        </button>
      )}
    </div>
  );
}

function FxItem({ fx, sec, reduced }: { fx: Fx; sec: number; reduced: boolean }) {
  const { ev, side, at, to, from, boxes } = fx;
  // Traço do card que causou até o que foi afetado (quando os dois estão no tabuleiro e não são o mesmo).
  const link = from && at && from !== at && !reduced ? <Link from={from} to={at} sec={Math.min(sec, 0.7)} /> : null;
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
    case 'heal':
      return at ? (
        <>
          {link}
          <div className="fx-at fx-box" style={{ left: at.x, top: at.y, width: at.w, height: at.h }}>
            <m.div
              className={`fx-flash ${ev.kind === 'damage' ? 'fx-flash-red' : 'fx-flash-green'}`}
              initial={{ opacity: 0.7 }}
              animate={{ opacity: 0 }}
              transition={{ duration: Math.min(sec, 0.45) }}
            />
          </div>
        </>
      ) : null;
    case 'stress':
      return at ? (
        <>
          {link}
          <FloatNumber at={at} sec={sec} tone={ev.amount > 0 ? 'bad' : 'good'}>
            {ev.amount > 0 ? '+' : '−'}
            {Math.abs(ev.amount)} Estresse
          </FloatNumber>
        </>
      ) : null;
    case 'meltdown':
      return (
        <>
          {at && (
            <div className="fx-at fx-box" style={{ left: at.x, top: at.y, width: at.w, height: at.h }}>
              <m.div
                className="fx-flash fx-flash-red"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.9, 0.2, 0.8, 0] }}
                transition={{ duration: sec }}
              />
            </div>
          )}
          <m.div
            className="fx-banner fx-banner-danger"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={reduced ? { opacity: [0, 1, 1, 0] } : { opacity: [0, 1, 1, 0], scale: [0.7, 1.08, 1, 1] }}
            transition={{ duration: sec, times: [0, 0.15, 0.8, 1] }}
          >
            LIMITE DE ESTRESSE!
          </m.div>
        </>
      );
    case 'destroy':
      return at ? (
        <>
          {link}
          <Ghost cardId={ev.cardId} from={at} to={to} sec={sec} reduced={reduced} mode="shatter" />
        </>
      ) : null;
    case 'bounce':
      return at ? (
        <>
          {link}
          <Ghost cardId={ev.cardId ?? null} from={at} to={to} sec={sec} reduced={reduced} mode="return" />
        </>
      ) : null;
    case 'reveal':
    case 'flip':
      return <Ghost cardId={ev.cardId} from={at} to={to} sec={sec} reduced={reduced} mode="reveal" side={side} />;
    case 'activate':
      return (
        <>
          {/* A sua própria Task você já viu sair da mão: o destaque é para a do oponente. */}
          {side === 'opp' && <Ghost cardId={ev.cardId} to={to} sec={sec} reduced={reduced} mode="reveal-faceup" side={side} />}
          {at && <Pulse at={at} sec={sec} reduced={reduced} tone="gold" />}
        </>
      );
    case 'effect':
      return at ? (
        <>
          {link}
          <Pulse at={at} sec={sec} reduced={reduced} tone={side === 'me' ? 'gold' : 'violet'} />
        </>
      ) : null;
    case 'stat':
      return (
        <>
          {ev.items.map((x, i) => {
            const b = boxes?.[i];
            if (!b) return null;
            const lines = [x.atk && { v: x.atk, label: 'ATK' }, x.def && { v: x.def, label: 'DEF' }].filter((l) => !!l);
            return (
              <FloatNumber key={x.iid} at={b} sec={sec} tone={lines[0].v > 0 ? 'good' : 'bad'} over>
                {lines.map((l) => (
                  <span key={l.label} className={l.v > 0 ? 'is-good' : 'is-bad'}>
                    {l.v > 0 ? '+' : '−'}
                    {Math.abs(l.v)} {l.label}
                  </span>
                ))}
              </FloatNumber>
            );
          })}
        </>
      );
    case 'negate':
      return <>{ev.items.map((x, i) => boxes?.[i] && <Stamp key={x.iid} at={boxes[i]} sec={sec} reduced={reduced} text="ANULADO" />)}</>;
    case 'position':
      return <>{ev.items.map((x, i) => boxes?.[i] && <Pulse key={x.iid} at={boxes[i]} sec={sec} reduced={reduced} tone="violet" />)}</>;
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
 * estilhaçar e ir para o cemitério, voltar para a mão, ou virar/aparecer em destaque no centro.
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
  cardId: string | null;
  from?: Box;
  to?: Box;
  sec: number;
  reduced: boolean;
  mode: 'shatter' | 'return' | 'reveal' | 'reveal-faceup';
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

  const face = <CardMini cardId={cardId} />;
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
        {face}
        {!reduced && (
          <m.div className="fx-crack" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0] }} transition={{ duration: sec * 0.6 }} />
        )}
      </m.div>
    );
  }
  if (mode === 'return') {
    return (
      <m.div
        className="fx-ghost"
        style={box}
        initial={{ scale: 1, opacity: 1 }}
        animate={reduced ? { opacity: 0 } : { scale: [1, 1.2, 0.7], x: [0, 0, dxEnd], y: [0, -14, dyEnd], opacity: [1, 1, 0] }}
        transition={{ duration: sec, times: reduced ? undefined : [0, 0.3, 1], ease: 'easeInOut' }}
      >
        {face}
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
      <FlipCard revealed={revealed} back={<CardMini cardId={null} />} front={face} duration={reduced ? 0 : 0.35} />
    </m.div>
  );
}
