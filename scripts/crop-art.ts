/**
 * Recorta as ilustrações das imagens originais (assets/source) para
 * apps/web/public/art no formato da janela de arte do card (≈1.163:1).
 * Regiões mais largas que o alvo são encaixadas sobre uma cópia desfocada,
 * para não cortar o texto dos stickers.
 *
 * Uso: npm run crop-art            (todos)
 *      npm run crop-art -- juju diegao   (só os ids informados)
 */
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const OUT_W = 720;
const OUT_H = 620;
const SRC = 'assets/source';
const OUT = 'apps/web/public/art';

type Box = { left: number; top: number; width: number; height: number };

// Regiões medidas nas imagens enviadas (pixels da imagem original).
const CROPS: Record<string, { src: string; box?: Box }> = {
  // Cartas prontas: só a janela da ilustração.
  thy_revisor: { src: 'thy_revisor', box: { left: 96, top: 192, width: 572, height: 500 } },
  thy_filosofo: { src: 'thy_filosofo', box: { left: 106, top: 182, width: 619, height: 532 } },
  thy_techlead: { src: 'thy_techlead', box: { left: 150, top: 318, width: 470, height: 405 } },
  vitor: { src: 'vitor', box: { left: 113, top: 210, width: 595, height: 520 } },
  danilo: { src: 'danilo', box: { left: 96, top: 192, width: 572, height: 510 } },
  douglas_ataque: { src: 'douglas_ataque', box: { left: 96, top: 192, width: 572, height: 510 } },
  douglas_defensivo: { src: 'douglas_defensivo', box: { left: 96, top: 192, width: 590, height: 520 } },
  // Stickers: imagem inteira ou faixa central.
  douglas_problemas: { src: 'douglas_problemas' },
  douglas_calma: { src: 'douglas_calma' },
  wisley: { src: 'wisley' },
  moises: { src: 'moises' },
  paquito: { src: 'paquito' },
  gato_gordo: { src: 'gato_gordo' },
  kelly: { src: 'kelly', box: { left: 170, top: 0, width: 684, height: 572 } },
  gama: { src: 'gama', box: { left: 110, top: 0, width: 804, height: 572 } },
  patricia: { src: 'patricia', box: { left: 160, top: 0, width: 712, height: 572 } },
  // Segunda leva (cartas prontas, 1493×2000; Juju 1620×2000): janela da ilustração sem a moldura.
  pirulito: { src: 'pirulito', box: { left: 188, top: 388, width: 1117, height: 960 } },
  diegao: { src: 'diegao', box: { left: 188, top: 388, width: 1120, height: 963 } },
  mao_moises: { src: 'mao_moises', box: { left: 190, top: 388, width: 1112, height: 956 } },
  juju_serio: { src: 'juju_serio', box: { left: 195, top: 395, width: 1105, height: 950 } },
  brunao: { src: 'brunao', box: { left: 195, top: 388, width: 1103, height: 948 } },
  careca_pensante: { src: 'careca_pensante', box: { left: 198, top: 390, width: 1100, height: 946 } },
  juju: { src: 'juju', box: { left: 205, top: 385, width: 1210, height: 1040 } },
  // Terceira leva (765×1024).
  sandro: { src: 'sandro', box: { left: 98, top: 198, width: 570, height: 492 } },
};

const only = process.argv.slice(2);

mkdirSync(OUT, { recursive: true });

for (const [id, { src, box }] of Object.entries(CROPS)) {
  if (only.length && !only.includes(id)) continue;
  const base = sharp(`${SRC}/${src}.webp`);
  const region = await (box ? base.extract(box) : base).toBuffer();
  const bg = await sharp(region).resize(OUT_W, OUT_H, { fit: 'cover' }).blur(28).modulate({ brightness: 0.6 }).toBuffer();
  const fg = await sharp(region).resize(OUT_W, OUT_H, { fit: 'inside' }).toBuffer();
  await sharp(bg)
    .composite([{ input: fg, gravity: 'center' }])
    .webp({ quality: 84 })
    .toFile(`${OUT}/${id}.webp`);
  console.log('✔', id);
}
