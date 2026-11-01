import { readFileSync } from 'node:fs';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { ART_H, ART_W, boxFits, inspectImage, renderCardArt, sniffImage } from './index';

const root = new URL('../../../', import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root));

describe('arte dos cards', () => {
  it('reconhece PNG, JPEG e WebP pelos bytes e recusa SVG e GIF', async () => {
    const png = await sharp({ create: { width: 4, height: 4, channels: 3, background: '#f00' } }).png().toBuffer();
    const jpeg = await sharp(png).jpeg().toBuffer();
    const webp = await sharp(png).webp().toBuffer();
    expect([sniffImage(png), sniffImage(jpeg), sniffImage(webp)]).toEqual(['png', 'jpeg', 'webp']);
    expect(sniffImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'))).toBeNull();
    expect(sniffImage(Buffer.from('GIF89a'))).toBeNull();
    await expect(inspectImage(Buffer.from('<svg/>'))).rejects.toThrow();
  });

  it('gera WebP 720×620 sem metadados, com ou sem recorte', async () => {
    const photo = await sharp({ create: { width: 1200, height: 800, channels: 3, background: '#3a6' } })
      .jpeg()
      .withExif({ IFD0: { Copyright: 'segredo' } })
      .toBuffer();
    for (const box of [undefined, { left: 100, top: 50, width: 700, height: 600 }]) {
      const out = await renderCardArt(photo, box);
      const meta = await sharp(out).metadata();
      expect([meta.format, meta.width, meta.height]).toEqual(['webp', ART_W, ART_H]);
      expect(meta.exif).toBeUndefined();
    }
  });

  it('valida a caixa de recorte', () => {
    expect(boxFits({ left: 0, top: 0, width: 10, height: 10 }, 10, 10)).toBe(true);
    expect(boxFits({ left: 1, top: 0, width: 10, height: 10 }, 10, 10)).toBe(false);
    expect(boxFits({ left: 0.5, top: 0, width: 5, height: 5 }, 10, 10)).toBe(false);
    expect(boxFits({ left: 0, top: 0, width: 0, height: 5 }, 10, 10)).toBe(false);
  });

  it('o crop-art gera a mesma arte que está no repositório (mesmo algoritmo)', async () => {
    const out = await renderCardArt(read('assets/source/qa.webp'), { left: 90, top: 206, width: 606, height: 474 });
    expect(out.equals(read('apps/web/public/art/qa.webp'))).toBe(true);
  });
});
