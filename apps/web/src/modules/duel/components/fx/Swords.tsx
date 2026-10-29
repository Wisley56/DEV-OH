import { m } from 'framer-motion';

/** Uma espada apontando para cima (lâmina, guarda, cabo e pomo). */
function Sword({ id }: { id: string }) {
  return (
    <svg viewBox="0 0 40 160" width="40" height="160" aria-hidden>
      <defs>
        <linearGradient id={`blade-${id}`} x1="0" x2="1">
          <stop offset="0" stopColor="#f4f7ff" />
          <stop offset="0.5" stopColor="#b9c3dc" />
          <stop offset="1" stopColor="#7f8aa6" />
        </linearGradient>
      </defs>
      <path d="M20 2 L28 22 L28 108 L12 108 L12 22 Z" fill={`url(#blade-${id})`} stroke="#4b5571" strokeWidth="1.5" />
      <path d="M20 8 L20 104" stroke="#ffffff" strokeOpacity="0.7" strokeWidth="1.5" />
      <rect x="2" y="106" width="36" height="9" rx="4" fill="#d9a83a" stroke="#7a5512" strokeWidth="1.5" />
      <rect x="15" y="115" width="10" height="32" rx="3" fill="#6b3f1d" stroke="#3b210d" strokeWidth="1.5" />
      <circle cx="20" cy="151" r="7" fill="#d9a83a" stroke="#7a5512" strokeWidth="1.5" />
    </svg>
  );
}

/**
 * Duas espadas cruzando e batendo uma na outra, com um clarão no choque.
 * `size` é a altura das espadas em px; `duration` em segundos.
 */
export function Swords({ size, duration }: { size: number; duration: number }) {
  const scale = size / 160;
  const swing = { duration, times: [0, 0.55, 0.7, 1], ease: 'easeOut' as const };
  return (
    <div className="fx-swords" style={{ width: size, height: size }}>
      <m.div
        className="fx-sword"
        style={{ scale }}
        initial={{ rotate: -75, x: -size * 0.45, opacity: 0 }}
        animate={{ rotate: [-75, -28, -36, -32], x: [-size * 0.45, -size * 0.04, -size * 0.1, -size * 0.08], opacity: [0, 1, 1, 0] }}
        transition={swing}
      >
        <Sword id="l" />
      </m.div>
      <m.div
        className="fx-sword"
        style={{ scale }}
        initial={{ rotate: 75, x: size * 0.45, opacity: 0 }}
        animate={{ rotate: [75, 28, 36, 32], x: [size * 0.45, size * 0.04, size * 0.1, size * 0.08], opacity: [0, 1, 1, 0] }}
        transition={swing}
      >
        <Sword id="r" />
      </m.div>
      <m.div
        className="fx-clash"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 0, 1.4, 0.6], opacity: [0, 0, 1, 0] }}
        transition={{ duration, times: [0, 0.5, 0.62, 1] }}
      />
    </div>
  );
}
