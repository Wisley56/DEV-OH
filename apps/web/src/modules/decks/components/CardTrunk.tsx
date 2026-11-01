import { Archive, LayoutGrid } from 'lucide-react';
import { useState } from 'react';
import { EMPTY_FILTER, type CollectionFilter } from '../../collection';
import { TrunkCards } from './TrunkCards';
import { TrunkDecks } from './TrunkDecks';

type View = 'cards' | 'decks';

const TABS: { id: View; label: string; icon: typeof LayoutGrid }[] = [
  { id: 'cards', label: 'Cards', icon: LayoutGrid },
  { id: 'decks', label: 'Decks', icon: Archive },
];

/** Painel da direita: alterna entre o catálogo de cards e a lista de decks. */
export function CardTrunk() {
  const [view, setView] = useState<View>('cards');
  // Fica aqui para a busca e os filtros sobreviverem à troca de aba.
  const [filter, setFilter] = useState<CollectionFilter>(EMPTY_FILTER);

  return (
    <section className="db-trunk panel" aria-label={view === 'cards' ? 'Cards disponíveis' : 'Decks'}>
      <div className="tabs db-trunk-tabs" role="tablist" aria-label="Mostrar">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`db-tab-${id}`}
            aria-selected={view === id}
            aria-controls="db-trunk-view"
            className={`tab ${view === id ? 'on' : ''}`}
            onClick={() => setView(id)}
          >
            <Icon size={16} aria-hidden /> {label}
          </button>
        ))}
      </div>
      <div id="db-trunk-view" className="db-trunk-view" role="tabpanel" aria-labelledby={`db-tab-${view}`}>
        {view === 'cards' ? <TrunkCards filter={filter} onFilter={setFilter} /> : <TrunkDecks />}
      </div>
    </section>
  );
}
