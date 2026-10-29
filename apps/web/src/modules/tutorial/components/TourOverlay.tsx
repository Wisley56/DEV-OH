import { useEffect, useLayoutEffect, useState } from 'react';
import { Button } from '../../../shared/ui';
import type { TourStep } from '../services/steps';

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const PAD = 6;
const GAP = 12;
const TIP_W = 300;

/** Retângulo do elemento do passo, ou null se ele não estiver visível nesta tela. */
function rectOf(step: TourStep): Rect | null {
  const el = document.querySelector(`[data-tour="${step.target}"]`);
  const r = el?.getBoundingClientRect();
  if (!r || r.width < 4 || r.height < 4 || r.bottom < 0 || r.top > window.innerHeight) return null;
  return { x: r.left - PAD, y: r.top - PAD, w: r.width + PAD * 2, h: r.height + PAD * 2 };
}

/**
 * Tour guiado: escurece a tela, recorta o elemento de cada passo e mostra um balão
 * com Voltar/Próximo/Pular. Passos cujo elemento não aparece nesta tela são pulados.
 */
export function TourOverlay({ steps, onClose }: { steps: TourStep[]; onClose: () => void }) {
  // Passos visíveis são medidos depois que o tabuleiro já está na tela.
  const [visible, setVisible] = useState<TourStep[] | null>(null);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const step = visible?.[i];

  useLayoutEffect(() => setVisible(steps.filter((s) => rectOf(s))), [steps]);

  useLayoutEffect(() => {
    if (!step) return;
    const update = () => setRect(rectOf(step));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [step]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    if (visible && !visible.length) onClose();
  }, [visible, onClose]);

  if (!visible || !step || !rect) return null;
  const last = i === visible.length - 1;
  // Balão abaixo do destaque se couber; senão acima. Sempre dentro da tela.
  const tipW = Math.min(TIP_W, window.innerWidth - 16);
  const below = rect.y + rect.h + GAP + 170 < window.innerHeight;
  const left = Math.min(Math.max(8, rect.x + rect.w / 2 - tipW / 2), window.innerWidth - tipW - 8);
  const top = below ? rect.y + rect.h + GAP : Math.max(8, rect.y - GAP - 170);

  return (
    <div className="tour" role="dialog" aria-modal="true" aria-label={`Tutorial: ${step.title}`}>
      <div className="tour-hole" style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }} />
      <div className="tour-tip" style={{ left, top, width: tipW }}>
        <p className="tour-count">
          {i + 1} de {visible.length}
        </p>
        <h3>{step.title}</h3>
        <p>{step.text}</p>
        <div className="tour-actions">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Pular
          </Button>
          {i > 0 && (
            <Button size="sm" onClick={() => setI(i - 1)}>
              Voltar
            </Button>
          )}
          <Button variant="primary" size="sm" onClick={() => (last ? onClose() : setI(i + 1))}>
            {last ? 'Jogar!' : 'Próximo'}
          </Button>
        </div>
      </div>
    </div>
  );
}
