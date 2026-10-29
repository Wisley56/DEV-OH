import { useEffect, useRef } from 'react';
import { useNow } from '../../../shared/lib/useNow';
import { sfx } from '../../sound';
import { useDuel } from '../hooks/useDuel';

const R = 15;
const CIRC = 2 * Math.PI * R;
/** A partir daqui o anel fica vermelho e, no seu turno, toca o tique. */
const URGENT_S = 10;

/** Anel com o tempo que resta no turno (só no online, quando o controlador informa o prazo). */
export function TurnTimer({ deadline }: { deadline: number }) {
  const { myTurn } = useDuel();
  const now = useNow(250);
  // Duração total = prazo quando ele mudou (turno novo) menos o momento em que chegou.
  const total = useRef({ deadline, ms: Math.max(1, deadline - Date.now()) });
  if (total.current.deadline !== deadline) total.current = { deadline, ms: Math.max(1, deadline - now) };
  const left = Math.max(0, deadline - now);
  const secs = Math.ceil(left / 1000);
  const urgent = secs <= URGENT_S;
  const lastTick = useRef<number | null>(null);
  useEffect(() => {
    if (!myTurn || !urgent || secs === 0 || lastTick.current === secs) return;
    lastTick.current = secs;
    sfx.play('tick');
  }, [secs, urgent, myTurn]);
  return (
    <div
      className={`turn-timer ${urgent ? 'urgent' : ''} ${myTurn ? 'mine' : ''}`}
      title={`${secs}s para ${myTurn ? 'você' : 'o oponente'} jogar`}
    >
      <svg viewBox="0 0 36 36" width="34" height="34" aria-hidden>
        <circle cx="18" cy="18" r={R} className="tt-track" />
        <circle cx="18" cy="18" r={R} className="tt-fill" strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - left / total.current.ms)} />
      </svg>
      <span className="tt-secs">{secs}</span>
    </div>
  );
}
