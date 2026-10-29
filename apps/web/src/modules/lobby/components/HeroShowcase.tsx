import { m } from 'framer-motion';
import { CardFull } from '../../cards';

const HERO = ['douglas_ataque', 'thy_revisor', 'wisley'];

/** Topo da tela inicial: três cards em leque, logo e slogan. */
export function HeroShowcase() {
  return (
    <header className="hero">
      <div className="hero-cards" aria-hidden>
        {HERO.map((id, i) => (
          <m.div
            key={id}
            className="hero-card"
            initial={{ y: 60, opacity: 0, rotate: 0 }}
            animate={{ y: i === 1 ? -14 : 0, opacity: 1, rotate: (i - 1) * 12 }}
            transition={{ delay: 0.15 * i, type: 'spring', stiffness: 120 }}
          >
            <CardFull cardId={id} />
          </m.div>
        ))}
      </div>
      <h1 className="logo">
        DEV<span>-</span>OH!
      </h1>
      <p className="tagline">A Era dos Devs que Agem — duelo de cards da squad</p>
    </header>
  );
}
