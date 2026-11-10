import { m } from 'framer-motion';
import type { ReactNode } from 'react';

/** Retângulo na tela (pixels da viewport). */
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

const mid = (b: Box) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });

/** Traço animado do card que causou o efeito até o que foi afetado, com um ponto que percorre o caminho. */
export function Link({ from, to, sec }: { from: Box; to: Box; sec: number }) {
  const a = mid(from);
  const b = mid(to);
  return (
    <svg className="fx-link" width="100%" height="100%">
      <m.line
        x1={a.x}
        y1={a.y}
        x2={b.x}
        y2={b.y}
        initial={{ pathLength: 0, opacity: 0.9 }}
        animate={{ pathLength: [0, 1, 1], opacity: [0.9, 0.9, 0] }}
        transition={{ duration: sec * 1.6, times: [0, 0.6, 1] }}
      />
      <m.circle
        r={6}
        initial={{ cx: a.x, cy: a.y, opacity: 1 }}
        animate={{ cx: [a.x, b.x, b.x], cy: [a.y, b.y, b.y], opacity: [1, 1, 0] }}
        transition={{ duration: sec * 1.6, times: [0, 0.6, 1] }}
      />
    </svg>
  );
}

/** Contorno que pulsa em volta de um card: "foi este aqui". */
export function Pulse({ at, sec, reduced, tone }: { at: Box; sec: number; reduced: boolean; tone: 'gold' | 'violet' }) {
  return (
    <m.div
      className={`fx-at fx-pulse fx-pulse-${tone}`}
      style={{ left: at.x, top: at.y, width: at.w, height: at.h }}
      initial={{ opacity: 0, scale: 1 }}
      animate={reduced ? { opacity: [0, 1, 0] } : { opacity: [0, 1, 0.6, 1, 0], scale: [1, 1.1, 1.04, 1.1, 1.16] }}
      transition={{ duration: Math.min(sec, 1.1) }}
    />
  );
}

/** Número que sobe: em cima do card (`over`) ou ao lado do medidor. */
export function FloatNumber({
  at,
  sec,
  tone,
  over = false,
  children,
}: {
  at: Box;
  sec: number;
  tone: 'good' | 'bad';
  over?: boolean;
  children: ReactNode;
}) {
  const c = mid(at);
  return (
    <m.div
      className={`fx-at fx-float is-${tone}`}
      style={{ left: c.x, top: over ? c.y : at.y }}
      initial={{ opacity: 0, y: 6, x: '-50%' }}
      animate={{ opacity: [0, 1, 1, 0], y: [6, -10, -22, -34], x: '-50%' }}
      transition={{ duration: sec, times: [0, 0.15, 0.75, 1] }}
    >
      {children}
    </m.div>
  );
}

/** Carimbo atravessado em cima de um card (efeitos anulados). */
export function Stamp({ at, sec, reduced, text }: { at: Box; sec: number; reduced: boolean; text: string }) {
  const c = mid(at);
  return (
    <m.div
      className="fx-at fx-stamp"
      style={{ left: c.x, top: c.y }}
      initial={{ opacity: 0, scale: 2.2, x: '-50%', y: '-50%', rotate: -14 }}
      animate={
        reduced
          ? { opacity: [0, 1, 1, 0], x: '-50%', y: '-50%', rotate: -14, scale: 1 }
          : { opacity: [0, 1, 1, 0], scale: [2.2, 1, 1, 1], x: '-50%', y: '-50%', rotate: -14 }
      }
      transition={{ duration: sec, times: [0, 0.2, 0.8, 1] }}
    >
      {text}
    </m.div>
  );
}
