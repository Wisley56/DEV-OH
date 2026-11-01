import sharp from 'sharp';

// O servidor recodifica uploads raros: o cache de operações do sharp só gastaria memória.
sharp.cache(false);

/**
 * Arte dos cards: recorte da imagem enviada no formato da janela de arte (720×620, ≈1.163:1).
 * Regiões de outra proporção são encaixadas sobre uma cópia desfocada, para não cortar nada.
 * Usado pelo `npm run crop-art` (cards em código) e pelo upload do criador de cartas.
 */

export const ART_W = 720;
export const ART_H = 620;
/** Teto do arquivo enviado e dos pixels decodificados (barra "bombas" de descompressão). */
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const MAX_INPUT_PIXELS = 40_000_000;

export type ImageFormat = 'png' | 'jpeg' | 'webp';

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Formato pelos primeiros bytes do arquivo (nunca pela extensão ou pelo Content-Type). SVG e GIF ficam de fora. */
export function sniffImage(buf: Uint8Array): ImageFormat | null {
  const at = (i: number, ...bytes: number[]) => bytes.every((b, k) => buf[i + k] === b);
  if (at(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return 'png';
  if (at(0, 0xff, 0xd8, 0xff)) return 'jpeg';
  if (at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50)) return 'webp';
  return null;
}

const open = (input: Buffer) => sharp(input, { limitInputPixels: MAX_INPUT_PIXELS, pages: 1 });

/** Dimensões de uma imagem válida; lança se o arquivo não decodifica ou passa do limite de pixels. */
export async function inspectImage(input: Buffer): Promise<{ width: number; height: number; format: ImageFormat }> {
  const format = sniffImage(input);
  if (!format) throw new Error('Formato de imagem não aceito.');
  const meta = await open(input).metadata();
  if (!meta.width || !meta.height) throw new Error('Imagem sem dimensões.');
  return { width: meta.width, height: meta.height, format };
}

/** A caixa cabe na imagem? (inteiros, dentro dos limites, com área). */
export function boxFits(box: Box, width: number, height: number): boolean {
  const ints = [box.left, box.top, box.width, box.height].every((n) => Number.isInteger(n));
  return (
    ints &&
    box.left >= 0 &&
    box.top >= 0 &&
    box.width > 0 &&
    box.height > 0 &&
    box.left + box.width <= width &&
    box.top + box.height <= height
  );
}

/**
 * Recorta `box` (ou a imagem inteira), encaixa sobre o fundo desfocado e grava em WebP q84.
 * A imagem é sempre recodificada: metadados (EXIF, GPS) não passam.
 */
export async function renderCardArt(input: Buffer, box?: Box): Promise<Buffer> {
  const base = open(input);
  const region = await (box ? base.extract(box) : base).toBuffer();
  const bg = await sharp(region).resize(ART_W, ART_H, { fit: 'cover' }).blur(28).modulate({ brightness: 0.6 }).toBuffer();
  const fg = await sharp(region).resize(ART_W, ART_H, { fit: 'inside' }).toBuffer();
  return sharp(bg)
    .composite([{ input: fg, gravity: 'center' }])
    .webp({ quality: 84 })
    .toBuffer();
}
