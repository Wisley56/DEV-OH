/**
 * Recorte da arte no navegador: uma caixa na proporção da janela de arte (720×620), em pixels
 * da imagem enviada. O servidor recebe a mesma caixa e faz o recorte de verdade.
 */

export const ART_W = 720;
export const ART_H = 620;
export const MAX_ZOOM = 4;

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** O que o admin mexe: zoom (1 = maior caixa possível) e o centro da caixa na imagem. */
export interface CropView {
  zoom: number;
  cx: number;
  cy: number;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Tamanho da caixa com zoom 1: a maior que cabe na imagem, na proporção da arte. */
function fullSize(w: number, h: number) {
  return w / h > ART_W / ART_H ? { width: (h * ART_W) / ART_H, height: h } : { width: w, height: (w * ART_H) / ART_W };
}

/** Começo: caixa máxima, centralizada. */
export const initialView = (w: number, h: number): CropView => ({ zoom: 1, cx: w / 2, cy: h / 2 });

/** Caixa inteira, dentro da imagem (o servidor recusa caixa fora). */
export function boxOf(view: CropView, w: number, h: number): Box {
  const full = fullSize(w, h);
  const zoom = clamp(view.zoom, 1, MAX_ZOOM);
  const width = clamp(Math.floor(full.width / zoom), 1, w);
  const height = clamp(Math.floor(full.height / zoom), 1, h);
  const left = clamp(Math.round(view.cx - width / 2), 0, w - width);
  const top = clamp(Math.round(view.cy - height / 2), 0, h - height);
  return { left, top, width, height };
}

/** Mantém o centro onde a caixa ainda cabe (depois de arrastar ou mudar o zoom). */
export function settle(view: CropView, w: number, h: number): CropView {
  const box = boxOf(view, w, h);
  return { zoom: clamp(view.zoom, 1, MAX_ZOOM), cx: box.left + box.width / 2, cy: box.top + box.height / 2 };
}

/** Arrasta a caixa `dx`/`dy` pixels da imagem. */
export const pan = (view: CropView, dx: number, dy: number, w: number, h: number) =>
  settle({ ...view, cx: view.cx + dx, cy: view.cy + dy }, w, h);

/** Muda o zoom mantendo o centro. */
export const zoomTo = (view: CropView, zoom: number, w: number, h: number) => settle({ ...view, zoom }, w, h);

/** Caixa em % da imagem, para desenhar a moldura sobre ela na tela. */
export function boxPercent(box: Box, w: number, h: number) {
  return { left: (100 * box.left) / w, top: (100 * box.top) / h, width: (100 * box.width) / w, height: (100 * box.height) / h };
}

/** Query do upload (`?left=…`). */
export const cropQuery = (box: Box) => `left=${box.left}&top=${box.top}&width=${box.width}&height=${box.height}`;
