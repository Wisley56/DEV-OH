import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { launchGhost, PATH_EASING, prepareGhost, timeAtProgress } from './cardFlight';

type Frame = { transform: string; opacity?: number; offset?: number };
type Call = { el: Element; frames: Frame[]; options: KeyframeAnimationOptions };

let calls: Call[] = [];
let anims: { onfinish: null | (() => void); oncancel: null | (() => void) }[] = [];

const rect = (el: Element, x: number, y: number, w: number, h: number) =>
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue(new DOMRect(x, y, w, h));

function tile() {
  const b = document.createElement('button');
  b.innerHTML = '<div class="card-mini">X<span class="badge">2</span></div>';
  document.body.appendChild(b);
  return b;
}

const path = () => calls.find((c) => c.el.classList.contains('db-flight'))!;
const lift = () => calls.find((c) => c.el.classList.contains('db-flight-lift'))!;
const num = (re: RegExp, f: Frame) => Number(re.exec(f.transform)?.[1] ?? 0);
const scaleOf = (f: Frame) => num(/scale\(([\d.]+)\)/, f);
const liftOf = (f: Frame) => num(/translateY\(([-\d.]+)px\)/, f);

beforeEach(() => {
  calls = [];
  anims = [];
  Element.prototype.animate = vi.fn(function (this: Element, kf: Keyframe[], options: KeyframeAnimationOptions) {
    calls.push({ el: this, frames: kf as unknown as Frame[], options });
    const a = { onfinish: null, oncancel: null };
    anims.push(a);
    return a as unknown as Animation;
  }) as unknown as typeof Element.prototype.animate;
});

afterEach(() => {
  document.body.innerHTML = '';
  // @ts-expect-error jsdom não tem animate: volta ao original.
  delete Element.prototype.animate;
  vi.restoreAllMocks();
});

describe('voo do card', () => {
  it('trajeto numa curva só, rápido no início e devagar no fim (sem pausa no meio)', () => {
    const from = tile();
    const to = tile();
    rect(from, 1000, 300, 80, 116);
    rect(to, 400, 300, 60, 87);
    launchGhost(prepareGhost(from), to, { hideTarget: true });

    const { frames, options } = path();
    expect(frames).toHaveLength(2);
    expect(scaleOf(frames[0])).toBe(1);
    expect(scaleOf(frames[1])).toBeCloseTo(60 / 80);
    expect(options.easing).toBe(`cubic-bezier(${PATH_EASING.join(', ')})`);
    // Fast-in, ease-out: metade do caminho em bem menos da metade do tempo.
    expect(timeAtProgress(PATH_EASING, 0.5)).toBeLessThan(0.4);
    expect(timeAtProgress([0, 0, 1, 1], 0.5)).toBeCloseTo(0.5);
  });

  it('a elevação chega ao pico quando o card passa pela metade do caminho', () => {
    const from = tile();
    const to = tile();
    rect(from, 1000, 300, 80, 116);
    rect(to, 400, 300, 60, 87);
    const ghost = prepareGhost(from)!;
    expect(ghost.el.querySelector('.badge')).toBeNull();
    launchGhost(ghost, to, { hideTarget: true });

    const [start, peak, end] = lift().frames;
    expect(peak.offset).toBeCloseTo(timeAtProgress(PATH_EASING, 0.5));
    expect(scaleOf(peak)).toBeGreaterThan(1);
    expect(liftOf(peak)).toBeLessThan(0);
    expect(scaleOf(start)).toBe(1);
    expect(scaleOf(end)).toBe(1);
    expect(liftOf(start)).toBe(0);
    expect(liftOf(end)).toBe(0);
    expect(lift().options.duration).toBe(path().options.duration);
  });

  it('esconde o destino até pousar e remove o clone', () => {
    const from = tile();
    const to = tile();
    rect(from, 1000, 300, 80, 116);
    rect(to, 400, 300, 60, 87);
    const anim = launchGhost(prepareGhost(from), to, { hideTarget: true }) as unknown as (typeof anims)[number];
    expect(document.querySelector('.db-flight')).not.toBeNull();
    expect(to.style.visibility).toBe('hidden');
    anim.onfinish!();
    expect(document.querySelector('.db-flight')).toBeNull();
    expect(to.style.visibility).toBe('');
  });

  it('sem destino visível, vai até a área e some', () => {
    const from = tile();
    const area = document.createElement('div');
    document.body.appendChild(area);
    rect(from, 100, 100, 80, 116);
    rect(area, 900, 0, 300, 600);
    launchGhost(prepareGhost(from), null, { fallbackArea: area });
    expect(path().frames.at(-1)!.opacity).toBe(0);
  });

  it('não anima com movimento reduzido', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList);
    const from = tile();
    rect(from, 0, 0, 80, 116);
    expect(prepareGhost(from)).toBeNull();
  });
});
