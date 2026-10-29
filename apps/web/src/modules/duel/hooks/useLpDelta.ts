import { useEffect, useRef, useState } from 'react';

/** Variação de LP recente (para o "+500"/"−800" que sobe na barra), some depois de 1,6 s. */
export function useLpDelta(lp: number) {
  const prev = useRef(lp);
  const [delta, setDelta] = useState<{ v: number; k: number } | null>(null);
  useEffect(() => {
    if (lp !== prev.current) {
      setDelta({ v: lp - prev.current, k: Date.now() });
      prev.current = lp;
      const t = setTimeout(() => setDelta(null), 1600);
      return () => clearTimeout(t);
    }
  }, [lp]);
  return delta;
}
