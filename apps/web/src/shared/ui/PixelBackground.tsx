import { useEffect, useRef } from 'react';

const CELL = 16;
const RADIUS = 140;
const LIFE_MS = 600;
const MAX_ALPHA = 0.18;

interface Lit {
  x: number;
  y: number;
  a: number;
  t: number;
}

/**
 * Fundo das telas de menu: as células da grade perto do cursor acendem em verde código e
 * esmaecem. Só desenha enquanto há célula acesa; fica desligado sem mouse (celular) e com
 * "reduzir movimento".
 */
export function PixelBackground() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = ref.current;
    if (!c || typeof matchMedia !== 'function') return;
    if (!matchMedia('(pointer: fine)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const cells = new Map<string, Lit>();
    let raf = 0;
    const fit = () => {
      c.width = innerWidth;
      c.height = innerHeight;
    };
    const draw = () => {
      const now = performance.now();
      ctx.clearRect(0, 0, c.width, c.height);
      for (const [k, v] of cells) {
        const a = v.a * (1 - (now - v.t) / LIFE_MS);
        if (a <= 0) {
          cells.delete(k);
          continue;
        }
        ctx.fillStyle = `rgba(124,255,178,${a.toFixed(3)})`;
        ctx.fillRect(v.x * CELL + 1, v.y * CELL + 1, CELL - 2, CELL - 2);
      }
      raf = cells.size ? requestAnimationFrame(draw) : 0;
    };
    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const now = performance.now();
      const n = Math.ceil(RADIUS / CELL);
      const cx = Math.floor(e.clientX / CELL);
      const cy = Math.floor(e.clientY / CELL);
      for (let y = cy - n; y <= cy + n; y++) {
        for (let x = cx - n; x <= cx + n; x++) {
          const d = Math.hypot((x + 0.5) * CELL - e.clientX, (y + 0.5) * CELL - e.clientY);
          if (d > RADIUS) continue;
          const a = MAX_ALPHA * (1 - d / RADIUS) ** 2;
          const key = `${x},${y}`;
          const old = cells.get(key);
          if (!old || a >= old.a * (1 - (now - old.t) / LIFE_MS)) cells.set(key, { x, y, a, t: now });
        }
      }
      if (!raf) raf = requestAnimationFrame(draw);
    };
    fit();
    addEventListener('resize', fit);
    addEventListener('pointermove', move, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener('resize', fit);
      removeEventListener('pointermove', move);
    };
  }, []);

  return <canvas ref={ref} className="pixel-bg" aria-hidden />;
}
