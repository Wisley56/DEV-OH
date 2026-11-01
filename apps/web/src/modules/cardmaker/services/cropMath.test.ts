import { describe, expect, it } from 'vitest';
import { ART_H, ART_W, boxOf, cropQuery, initialView, pan, zoomTo } from './cropMath';

const inside = (b: { left: number; top: number; width: number; height: number }, w: number, h: number) =>
  [b.left, b.top, b.width, b.height].every(Number.isInteger) && b.left >= 0 && b.top >= 0 && b.left + b.width <= w && b.top + b.height <= h;

describe('recorte da arte', () => {
  it('começa com a maior caixa possível, centralizada, na proporção 720:620', () => {
    const wide = boxOf(initialView(2000, 1000), 2000, 1000);
    expect(wide).toEqual({ left: 420, top: 0, width: 1161, height: 1000 });
    const tall = boxOf(initialView(600, 1200), 600, 1200);
    expect(tall).toEqual({ left: 0, top: 342, width: 600, height: 516 });
    expect(Math.abs(tall.width / tall.height - ART_W / ART_H)).toBeLessThan(0.01);
  });

  it('arrastar e dar zoom nunca tira a caixa da imagem', () => {
    let view = zoomTo(initialView(1000, 800), 2.5, 1000, 800);
    for (const [dx, dy] of [
      [-5000, 0],
      [0, 9999],
      [123, -45],
      [9999, -9999],
    ]) {
      view = pan(view, dx!, dy!, 1000, 800);
      expect(inside(boxOf(view, 1000, 800), 1000, 800)).toBe(true);
    }
    expect(boxOf(zoomTo(view, 99, 1000, 800), 1000, 800).width).toBe(232);
    expect(boxOf(zoomTo(view, 0, 1000, 800), 1000, 800).width).toBe(929);
  });

  it('monta a query do upload', () => {
    expect(cropQuery({ left: 1, top: 2, width: 3, height: 4 })).toBe('left=1&top=2&width=3&height=4');
  });
});
