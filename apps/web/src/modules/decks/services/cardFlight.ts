/**
 * Animação de um card voando entre o catálogo e o deck.
 * Um clone fixo na tela vai da origem ao destino; no meio do caminho ele cresce, sobe e ganha
 * sombra (parece levantado, mais perto da tela) e depois "pousa" no destino.
 *
 * São duas camadas: a de fora faz o trajeto numa curva só (rápido no início, devagar no fim,
 * sem parada no meio); a de dentro faz a "elevação", com o pico no instante em que o card
 * passa pela metade do caminho.
 */

export const FLIGHT_MS = 560;

/** Curva do trajeto: arranque rápido e chegada suave (fast-in, ease-out). */
export const PATH_EASING: [number, number, number, number] = [0.25, 0.8, 0.35, 1];

/** Fração do tempo em que uma cubic-bezier CSS chega a `progress` do caminho. */
export function timeAtProgress([x1, y1, x2, y2]: readonly number[], progress: number): number {
  const bez = (a: number, b: number, s: number) => 3 * a * (1 - s) ** 2 * s + 3 * b * (1 - s) * s ** 2 + s ** 3;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 40; i++) {
    const s = (lo + hi) / 2;
    if (bez(y1, y2, s) < progress) lo = s;
    else hi = s;
  }
  return bez(x1, x2, (lo + hi) / 2);
}

const PEAK_AT = timeAtProgress(PATH_EASING, 0.5);

/** Quanto o card cresce no meio do voo (além da interpolação de tamanho). */
const LIFT_SCALE = 1.3;

export interface Ghost {
  el: HTMLElement;
  from: DOMRect;
}

const canAnimate = () =>
  typeof Element !== 'undefined' &&
  typeof Element.prototype.animate === 'function' &&
  !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const visible = (r: DOMRect) => r.width > 0 && r.height > 0;

/** Clona o card da origem antes de o estado mudar (a origem pode sumir, como ao tirar do deck). */
export function prepareGhost(source: Element | null | undefined): Ghost | null {
  if (!source || !canAnimate()) return null;
  const from = source.getBoundingClientRect();
  if (!visible(from)) return null;
  const face = source.querySelector('.card-mini, .card-full') ?? source;
  const clone = face.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('.badge').forEach((b) => b.remove());
  const el = document.createElement('div');
  el.className = 'db-flight';
  el.setAttribute('aria-hidden', 'true');
  Object.assign(el.style, { left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px` });
  const lift = document.createElement('div');
  lift.className = 'db-flight-lift';
  lift.appendChild(clone);
  el.appendChild(lift);
  return { el, from };
}

/** Fica dentro da área visível de `area` (catálogo com rolagem)? */
function inside(r: DOMRect, area: Element | null) {
  if (!area) return true;
  const a = area.getBoundingClientRect();
  const cy = r.top + r.height / 2;
  return cy >= a.top && cy <= a.bottom;
}

/**
 * Voa o clone até `target`. Sem destino visível, vai até o centro de `fallbackArea` e some.
 * `hideTarget` esconde o destino durante o voo (o card novo no deck só aparece quando pousa).
 */
export function launchGhost(
  ghost: Ghost | null,
  target: HTMLElement | null,
  { hideTarget = false, fallbackArea = null }: { hideTarget?: boolean; fallbackArea?: Element | null } = {},
): Animation | null {
  if (!ghost) return null;
  const { el, from } = ghost;
  let to = target?.getBoundingClientRect();
  let fade = false;
  if (!to || !visible(to) || !inside(to, fallbackArea)) {
    if (!fallbackArea) return null;
    const a = fallbackArea.getBoundingClientRect();
    const w = from.width;
    const h = from.height;
    to = new DOMRect(a.left + a.width / 2 - w / 2, a.top + a.height / 2 - h / 2, w, h);
    target = null;
    fade = true;
  }

  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  const end = to.width / from.width;
  // Sobe um pouco no meio do caminho: arco, como se o card fosse erguido.
  const rise = Math.min(70, 24 + Math.hypot(dx, dy) * 0.06);
  const tilt = dx >= 0 ? 6 : -6;
  const timing = { duration: FLIGHT_MS, fill: 'forwards' as const };

  document.body.appendChild(el);
  if (hideTarget && target) target.style.visibility = 'hidden';

  // Trajeto: uma curva só do início ao fim, sem pausa.
  const anim = el.animate(
    [
      { transform: 'translate(0, 0) scale(1)', opacity: 1 },
      { transform: `translate(${dx}px, ${dy}px) scale(${end})`, opacity: fade ? 0 : 1 },
    ],
    { ...timing, easing: `cubic-bezier(${PATH_EASING.join(', ')})` },
  );
  // Elevação: sobe, cresce e ganha sombra até a metade do caminho; depois desce até pousar.
  el.firstElementChild!.animate(
    [
      { transform: 'translateY(0) scale(1) rotate(0deg)', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.45))', easing: 'ease-out' },
      {
        offset: PEAK_AT,
        transform: `translateY(${-rise}px) scale(${LIFT_SCALE}) rotate(${tilt}deg)`,
        filter: 'drop-shadow(0 26px 22px rgba(0,0,0,0.55)) brightness(1.08)',
        easing: 'ease-in-out',
      },
      { transform: 'translateY(0) scale(1) rotate(0deg)', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.45))' },
    ],
    { ...timing, easing: 'linear' },
  );

  const done = () => {
    el.remove();
    if (target) {
      if (hideTarget) target.style.visibility = '';
      // Pequeno "pouso" no destino.
      if (target.isConnected)
        target.animate([{ transform: 'scale(1.08)' }, { transform: 'scale(1)' }], { duration: 160, easing: 'ease-out' });
    }
  };
  anim.onfinish = done;
  anim.oncancel = done;
  return anim;
}
