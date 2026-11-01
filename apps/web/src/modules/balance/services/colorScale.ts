/**
 * Escala divergente do painel: azul = ganha menos (pede buff), cinza = equilibrado, vermelho = ganha mais (pede nerf).
 * Polos e meio da paleta de referência para fundo escuro (dataviz): #3987e5 ↔ #383835 ↔ #e66767.
 */
const WEAK: RGB = [0x39, 0x87, 0xe5];
const MID: RGB = [0x38, 0x38, 0x35];
const STRONG: RGB = [0xe6, 0x67, 0x67];
type RGB = [number, number, number];

/** Distância de 50% em que a cor satura (±20 pontos). */
export const SATURATE_AT = 0.2;

const mix = (a: RGB, b: RGB, t: number) => a.map((v, i) => Math.round(v + (b[i] - v) * t)) as RGB;
const hex = (c: RGB) => `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;

export function winRateColor(p: number): string {
  const t = Math.max(-1, Math.min(1, (p - 0.5) / SATURATE_AT));
  return hex(t < 0 ? mix(MID, WEAK, -t) : mix(MID, STRONG, t));
}

export const WEAK_COLOR = hex(WEAK);
export const STRONG_COLOR = hex(STRONG);
export const MID_COLOR = hex(MID);

/** Meta de equilíbrio dos decks iniciais (DEVELOPER.md). */
export const TARGET_BAND: [number, number] = [0.45, 0.55];
export const inTarget = (p: number) => p >= TARGET_BAND[0] && p <= TARGET_BAND[1];
