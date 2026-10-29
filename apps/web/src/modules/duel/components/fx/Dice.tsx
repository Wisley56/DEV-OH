import { m } from 'framer-motion';
import { useEffect, useState } from 'react';

/** Quanto tempo o dado rola antes de parar na face sorteada (o som da queda usa o mesmo tempo). */
export const DICE_ROLL_MS = 950;
const FACE_STEP_MS = 85;

/** Posição das pintas de cada face numa grade 3×3 (0 = canto superior esquerdo, 8 = inferior direito). */
const PIPS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

function DieFace({ face }: { face: number }) {
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden>
      <defs>
        <linearGradient id="die-face" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#d9dce6" />
        </linearGradient>
      </defs>
      <rect x="3" y="3" width="94" height="94" rx="20" fill="url(#die-face)" stroke="#9aa0b4" strokeWidth="3" />
      {PIPS[face].map((p) => (
        <circle key={p} cx={22 + (p % 3) * 28} cy={22 + Math.floor(p / 3) * 28} r="9" fill={face === 1 ? '#c1121f' : '#1d1f2b'} />
      ))}
    </svg>
  );
}

/**
 * Dado rolando no centro da tela: entra pelo lado de quem jogou, gira trocando de face,
 * para na face sorteada e mostra se a jogada deu certo.
 */
export function Dice({
  face,
  bonus,
  ok,
  side,
  sec,
  reduced,
}: {
  face: number;
  bonus: number;
  ok: boolean;
  side: 'me' | 'opp';
  sec: number;
  reduced: boolean;
}) {
  const [shown, setShown] = useState(() => (reduced ? face : 1 + Math.floor(Math.random() * 6)));
  const [landed, setLanded] = useState(reduced);

  useEffect(() => {
    if (reduced) return;
    // Troca de face sem repetir a anterior, e para na face sorteada.
    const roll = setInterval(() => setShown((f) => 1 + ((f + Math.floor(Math.random() * 5)) % 6)), FACE_STEP_MS);
    const land = setTimeout(() => {
      clearInterval(roll);
      setShown(face);
      setLanded(true);
    }, DICE_ROLL_MS);
    return () => {
      clearInterval(roll);
      clearTimeout(land);
    };
  }, [face, reduced]);

  const from = side === 'opp' ? -1 : 1;
  const rollSec = DICE_ROLL_MS / 1000;
  return (
    <m.div
      className="fx-dice"
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 1, 0] }}
      transition={{ duration: sec, times: [0, 0.08, 0.88, 1] }}
    >
      <div className="fx-dice-title">🎲 A Mão do Moisés</div>
      <m.div
        className={`fx-die ${landed ? (ok ? 'is-ok' : 'is-fail') : ''}`}
        initial={reduced ? false : { y: from * 220, x: -from * 60, rotate: 0, scale: 0.7 }}
        animate={
          reduced
            ? { scale: 1 }
            : {
                y: [from * 220, -from * 40, 0, -18, 0],
                x: [-from * 60, from * 20, 0, 0, 0],
                rotate: [0, 380, 650, 700, 720],
                scale: [0.7, 1, 1, 1, 1],
              }
        }
        transition={{ duration: rollSec, times: [0, 0.45, 0.7, 0.85, 1], ease: 'easeOut' }}
      >
        <DieFace face={shown} />
      </m.div>
      <m.div
        className={`fx-dice-result ${ok ? 'is-ok' : 'is-fail'}`}
        initial={{ opacity: 0, y: 8 }}
        animate={landed ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
        transition={{ duration: 0.25 }}
      >
        <div className="fx-dice-total">
          {bonus ? (
            <>
              {face} <small>+{bonus} do Moisés</small> = {face + bonus}
            </>
          ) : (
            face
          )}
        </div>
        <div>{ok ? '4 ou mais: derrubou todos os bugs!' : 'Menos de 4: a mão pegou a própria squad!'}</div>
      </m.div>
    </m.div>
  );
}
