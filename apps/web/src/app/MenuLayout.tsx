import { BookOpen, Layers, Swords, Trophy } from 'lucide-react';
import { Link, NavLink, Outlet } from 'react-router';
import { AccountBar } from '../modules/auth';
import { SoundToggle } from '../modules/sound';
import { PixelBackground } from '../shared/ui';

const LINKS = [
  { to: '/', label: 'Jogar', Icon: Swords },
  { to: '/colecao', label: 'Coleção', Icon: BookOpen },
  { to: '/decks', label: 'Decks', Icon: Layers },
  { to: '/ranking', label: 'Ranking', Icon: Trophy },
];

/** Telas de menu: barra superior (no celular, abas embaixo) e o fundo de pixels. O duelo fica fora. */
export function MenuLayout() {
  return (
    <div className="menu-layout">
      <PixelBackground />
      <header className="topbar">
        <div className="topbar-inner">
          <Link to="/" className="topbar-logo" aria-label="DEV-OH! — início">
            DEV<span>-</span>OH!
          </Link>
          <nav className="topnav" aria-label="Principal">
            {LINKS.map(({ to, label, Icon }) => (
              <NavLink key={to} to={to} end className="topnav-link">
                <Icon size={18} strokeWidth={1.75} aria-hidden />
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="topbar-tools">
            <SoundToggle />
            <AccountBar />
          </div>
        </div>
      </header>
      <main className="menu-main">
        <Outlet />
      </main>
    </div>
  );
}
