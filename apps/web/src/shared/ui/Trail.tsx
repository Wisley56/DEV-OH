import { Link } from 'react-router';

/** Trilha "// admin / criador de cartas" acima do título das telas internas. */
export function Trail({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <nav className="trail" aria-label="Trilha">
      {items.map((it, i) => (
        <span key={it.label} className="trail-item">
          {i > 0 && (
            <span className="trail-sep" aria-hidden>
              /
            </span>
          )}
          {it.to ? <Link to={it.to}>{it.label}</Link> : <span aria-current="page">{it.label}</span>}
        </span>
      ))}
    </nav>
  );
}
