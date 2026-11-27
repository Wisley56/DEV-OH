import { m } from 'framer-motion';
import { CardMini } from '../../../cards';

/** Instante (ms, desde o início) do clarão em que as peças viram a fusão: o som acompanha. */
export const FUSION_FLASH_MS = 1900;

const CARD = { w: 92, h: 134 };

/**
 * Lugar de cada peça no "corpo", na ordem de `fusionOf` (cabeça, tronco, pernas, braço direito,
 * braço esquerdo), em unidades de card a partir do centro. O braço direito do boneco fica à
 * esquerda de quem olha, como na arte.
 */
const BODY: readonly [number, number][] = [
  [0, -1],
  [0, 0],
  [0, 1],
  [-1, -0.15],
  [1, -0.15],
];
/** De onde cada peça entra voando (fora da tela, na direção do seu lugar). */
const ENTRY: readonly [number, number][] = [
  [0, -4],
  [0, 4],
  [0, 4],
  [-5, -1],
  [5, -1],
];

/**
 * Fusão: as peças voam e se encaixam formando o corpo, tudo treme, um clarão, e a carta da fusão
 * aparece gigante no centro com o nome. Com movimento reduzido, só a carta aparece e some.
 */
export function Fusion({
  pieces,
  cardId,
  side,
  sec,
  reduced,
}: {
  pieces: string[];
  cardId: string;
  side: 'me' | 'opp';
  sec: number;
  reduced: boolean;
}) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const unit = Math.min(1.25, (vh * 0.24) / CARD.h, (vw * 0.26) / CARD.w);
  const w = CARD.w * unit;
  const h = CARD.h * unit;
  const step = { x: w * 1.08, y: h * 0.82 };
  const flash = Math.min(0.9, FUSION_FLASH_MS / 1000 / sec);
  const big = Math.min(3.2, (vh * 0.62) / CARD.h, (vw * 0.7) / CARD.w);
  const at = (dx: number, dy: number, cw: number, ch: number) => ({
    left: vw / 2 + dx - cw / 2,
    top: vh / 2 + dy - ch / 2,
    width: cw,
    height: ch,
  });

  return (
    <div className={`fx-fusion from-${side}`}>
      <m.div
        className="fx-fusion-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 1, 0] }}
        transition={{ duration: sec, times: [0, 0.08, 0.9, 1] }}
      />
      {!reduced &&
        pieces.map((id, i) => {
          const [bx, by] = BODY[i] ?? [0, 0];
          const [ex, ey] = ENTRY[i] ?? [0, 4];
          const land = 0.12 + i * 0.045;
          return (
            <m.div
              key={id}
              className="fx-ghost fx-fusion-piece"
              style={at(bx * step.x, by * step.y, w, h)}
              initial={{ x: ex * step.x, y: ey * step.y, rotate: ex * 8, opacity: 0 }}
              animate={{
                x: [ex * step.x, ex * step.x, 0, 0, -bx * step.x],
                y: [ey * step.y, ey * step.y, 0, 0, -by * step.y],
                rotate: [ex * 8, ex * 8, 0, 0, 0],
                opacity: [0, 1, 1, 1, 0],
                scale: [1, 1, 1, 1.05, 0.3],
                filter: ['brightness(1)', 'brightness(1)', 'brightness(1)', 'brightness(1.4)', 'brightness(3)'],
              }}
              transition={{ duration: sec, times: [0, land - 0.1, land + 0.1, flash - 0.03, flash], ease: 'easeOut' }}
            >
              <CardMini cardId={id} />
            </m.div>
          );
        })}
      <m.div
        className="fx-fusion-flash"
        initial={{ opacity: 0 }}
        animate={{ opacity: reduced ? [0, 0.6, 0] : [0, 0, 1, 0] }}
        transition={{ duration: reduced ? sec * 0.4 : sec, times: reduced ? undefined : [0, flash - 0.02, flash, flash + 0.12] }}
      />
      <m.div
        className="fx-ghost fx-fusion-card"
        style={at(0, -h * 0.15, CARD.w, CARD.h)}
        initial={{ scale: 0.2, opacity: 0 }}
        animate={{
          scale: reduced ? [big, big, big] : [0.2, 0.2, big * 1.08, big, big],
          opacity: reduced ? [0, 1, 0] : [0, 0, 1, 1, 0],
          rotate: reduced ? 0 : [0, 0, -3, 0, 0],
        }}
        transition={{ duration: sec, times: reduced ? [0, 0.2, 1] : [0, flash, flash + 0.1, 0.92, 1], ease: 'easeOut' }}
      >
        <CardMini cardId={cardId} />
      </m.div>
      <m.div
        className="fx-banner fx-banner-fusion"
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: [0, 0, 1, 1, 0], scale: reduced ? 1 : [0.6, 0.6, 1.12, 1, 1] }}
        transition={{ duration: sec, times: [0, flash + 0.04, flash + 0.14, 0.92, 1] }}
      >
        É HORA DOS DEVS MOCORONGOS!
      </m.div>
    </div>
  );
}
