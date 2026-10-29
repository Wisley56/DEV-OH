import { m } from 'framer-motion';

/** Escudo que surge e cresce um pouco: defesa bem-sucedida. */
export function Shield({ size, duration }: { size: number; duration: number }) {
  return (
    <m.div
      className="fx-shield"
      style={{ width: size, height: size * 1.15 }}
      initial={{ scale: 0.4, opacity: 0 }}
      animate={{ scale: [0.4, 1.12, 1, 1.05], opacity: [0, 1, 1, 0] }}
      transition={{ duration, times: [0, 0.35, 0.7, 1], ease: 'easeOut' }}
    >
      <svg viewBox="0 0 100 115" width="100%" height="100%" aria-hidden>
        <defs>
          <linearGradient id="shield-face" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#7cc3ff" />
            <stop offset="1" stopColor="#2b5fb8" />
          </linearGradient>
        </defs>
        <path
          d="M50 4 L92 18 L92 52 C92 80 72 100 50 111 C28 100 8 80 8 52 L8 18 Z"
          fill="url(#shield-face)"
          stroke="#e9b949"
          strokeWidth="5"
        />
        <path d="M50 16 L80 26 L80 52 C80 72 66 87 50 96 Z" fill="#ffffff" fillOpacity="0.18" />
        <path d="M50 30 L50 84 M30 50 L70 50" stroke="#ffd978" strokeWidth="7" strokeLinecap="round" />
      </svg>
    </m.div>
  );
}
