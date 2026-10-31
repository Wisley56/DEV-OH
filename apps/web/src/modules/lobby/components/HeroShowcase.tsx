import { m } from 'framer-motion';
import type { CSSProperties, ReactNode } from 'react';
import { CardFull } from '../../cards';

const HERO = ['thy_revisor', 'douglas_ataque', 'wisley'];

/** Topo da tela inicial: slogan e botões à esquerda; três cards em leque e o logo à direita. */
export function HeroShowcase({ children }: { children?: ReactNode }) {
  return (
    <header className="hero">
      <div className="hero-text">
        <p className="hero-eyebrow">// duelo de cards da squad</p>
        <p className="hero-title">
          A Era dos Devs
          <br />
          que Agem
        </p>
        <p className="hero-lead">
          Monte um deck com a squad, as tasks e os bugs do dia a dia. Quem zerar os 4000 LP do outro primeiro leva o deploy.
        </p>
        {children && <div className="hero-actions">{children}</div>}
      </div>
      <div className="hero-art">
        <div className="hero-cards" aria-hidden>
          {HERO.map((id, i) => (
            <m.div
              key={id}
              className="hero-card"
              initial={{ y: 60, opacity: 0, rotate: 0 }}
              animate={{ y: 0, opacity: 1, rotate: (i - 1) * 12 }}
              transition={{ delay: 0.15 * i, type: 'spring', stiffness: 120 }}
              style={{ '--i': i - 1 } as CSSProperties}
            >
              <CardFull cardId={id} />
            </m.div>
          ))}
        </div>
        <h1 className="logo">
          DEV<span>-</span>OH!
        </h1>
      </div>
    </header>
  );
}
