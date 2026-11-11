import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { sfx } from '../../sound';
import { useDuel, useDuelUi } from '../hooks/useDuel';
import { INTRO_BEATS, INTRO_MS, INTRO_SOUND_WAIT_MS, isDuelStart } from '../services/intro';

/** Entrada do logo (cai de grande, quica) e o pulso no último pico do som. */
const LOGO_SEC = INTRO_BEATS.pulse + 0.4;
const t = (sec: number) => sec / LOGO_SEC;

type Stop = ((fadeSec?: number) => void) | null;

/**
 * Abertura do duelo: o logo entra com o som "É hora do duelo!". Aparece quando o duelo começa
 * (treino, X1, torneio e para quem assiste) e de novo a cada revanche; tocar na tela pula.
 * Enquanto está na tela, conta como animação: o bot e o resultado esperam.
 */
export function DuelIntro() {
  const { view } = useDuel();
  const [run, setRun] = useState(() => (isDuelStart(view) ? 1 : 0));
  const [done, setDone] = useState(0);
  const stop = useRef<Stop>(null);
  const wasOver = useRef(view.winner !== null);

  // Revanche: o duelo acabou e recomeçou no mesmo tabuleiro.
  useEffect(() => {
    if (wasOver.current && isDuelStart(view)) setRun((r) => r + 1);
    wasOver.current = view.winner !== null;
  }, [view]);

  // Saiu do duelo no meio do som: para junto.
  useEffect(() => () => stop.current?.(0.3), []);

  return (
    <AnimatePresence>
      {run > done && (
        <IntroScreen
          key={run}
          onSound={(s) => (stop.current = s)}
          onDone={(skipped) => {
            if (skipped) stop.current?.(0.5);
            setDone(run);
          }}
        />
      )}
    </AnimatePresence>
  );
}

function IntroScreen({ onSound, onDone }: { onSound: (stop: Stop) => void; onDone: (skipped: boolean) => void }) {
  const { me, opp } = useDuel();
  const setIntro = useDuelUi((s) => s.setIntro);
  const reduced = !!useReducedMotion();
  // Espera o som carregar (no máximo um pouco) para a animação e o áudio começarem juntos.
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    setIntro(true);
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    void sfx.whenLoaded(INTRO_SOUND_WAIT_MS).then(() => {
      if (!alive) return;
      onSound(sfx.play('intro'));
      setPlaying(true);
      timer = setTimeout(() => onDone(false), INTRO_MS);
    });
    return () => {
      alive = false;
      clearTimeout(timer);
      setIntro(false);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const at = (delay: number) => ({ duration: reduced ? 0.3 : 0.45, delay: reduced ? 0 : delay });
  return (
    <m.div
      className="duel-intro"
      role="dialog"
      aria-label="É hora do duelo!"
      title="Toque para pular"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: reduced ? 1 : 1.08 }}
      transition={{ duration: 0.35 }}
      onClick={() => onDone(true)}
    >
      {playing && (
        <>
          {!reduced && <div className="di-rays" aria-hidden />}
          {!reduced && (
            <m.div className="di-flash" aria-hidden initial={{ opacity: 0.9 }} animate={{ opacity: 0 }} transition={{ duration: 0.5 }} />
          )}
          <m.h1
            className="di-logo"
            initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 3, rotate: -8 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, scale: [3, 0.92, 1.04, 1, 1, 1.12, 1], rotate: [-8, 2, -1, 0, 0, 0, 0] }}
            transition={
              reduced
                ? { duration: 0.3 }
                : {
                    duration: LOGO_SEC,
                    times: [0, t(0.38), t(0.55), t(0.7), t(INTRO_BEATS.pulse), t(INTRO_BEATS.pulse + 0.15), 1],
                    opacity: { duration: 0.25 },
                  }
            }
          >
            DEV<span>-</span>OH!
          </m.h1>
          <m.p className="di-tag" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={at(INTRO_BEATS.tag)}>
            É hora do duelo!
          </m.p>
          <div className="di-vs">
            <m.span
              className="di-name"
              initial={{ opacity: 0, x: reduced ? 0 : -60 }}
              animate={{ opacity: 1, x: 0 }}
              transition={at(INTRO_BEATS.names)}
            >
              {me.name}
            </m.span>
            <m.b initial={{ opacity: 0, scale: reduced ? 1 : 2 }} animate={{ opacity: 1, scale: 1 }} transition={at(INTRO_BEATS.vs)}>
              VS
            </m.b>
            <m.span
              className="di-name"
              initial={{ opacity: 0, x: reduced ? 0 : 60 }}
              animate={{ opacity: 1, x: 0 }}
              transition={at(INTRO_BEATS.names)}
            >
              {opp.name}
            </m.span>
          </div>
          <m.p className="di-skip" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={at(0.6)}>
            Toque para pular
          </m.p>
        </>
      )}
    </m.div>
  );
}
