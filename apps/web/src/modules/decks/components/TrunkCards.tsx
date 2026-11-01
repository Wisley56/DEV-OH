import { CARD_LIST, maxCopies } from '@devoh/engine';
import { ArrowDownWideNarrow, FilterX, Search, SlidersHorizontal } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '../../../shared/ui';
import { activeFilters, applyFilter, CollectionFilterFields, EMPTY_FILTER, SORTS, type CollectionFilter } from '../../collection';
import { countCards } from '../services/deckEditing';
import { useDeckBuilder } from '../store/deckBuilderStore';
import { CardTile } from './CardTile';

/** Aba "Cards" do painel da direita: catálogo com busca, filtros e ordenação; botão direito põe no deck. */
export function TrunkCards({ filter: f, onFilter: setF }: { filter: CollectionFilter; onFilter(next: CollectionFilter): void }) {
  const cards = useDeckBuilder((s) => s.editing.cards);
  const [showFilters, setShowFilters] = useState(false);
  const list = useMemo(() => applyFilter(CARD_LIST, f), [f]);
  const counts = useMemo(() => countCards(cards), [cards]);
  const active = activeFilters(f);
  const pristine = active === 0 && !f.query && f.sort === EMPTY_FILTER.sort;

  return (
    <>
      <label className="db-search">
        <Search size={16} aria-hidden />
        <input
          type="search"
          placeholder="Buscar por nome ou texto"
          aria-label="Buscar cards"
          value={f.query}
          onChange={(e) => setF({ ...f, query: e.target.value })}
        />
      </label>

      <div className="db-trunk-tools">
        <Button
          size="sm"
          aria-expanded={showFilters}
          aria-controls="db-trunk-filters"
          className={active ? 'has-filters' : ''}
          onClick={() => setShowFilters((v) => !v)}
          title="Filtros"
        >
          <SlidersHorizontal size={16} aria-hidden /> Filtros
          {active > 0 && <span className="db-filter-badge">{active}</span>}
        </Button>
        <label className="db-sort" title="Ordenar">
          <ArrowDownWideNarrow size={16} aria-hidden />
          <select aria-label="Ordenar" value={f.sort} onChange={(e) => setF({ ...f, sort: e.target.value as CollectionFilter['sort'] })}>
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <Button size="sm" disabled={pristine} onClick={() => setF(EMPTY_FILTER)} aria-label="Limpar filtros" title="Limpar busca e filtros">
          <FilterX size={16} aria-hidden />
        </Button>
      </div>

      {showFilters && (
        <div id="db-trunk-filters" className="db-trunk-filters">
          <CollectionFilterFields value={f} onChange={setF} withKind withSort={false} />
        </div>
      )}

      <p className="mono muted db-trunk-count">
        {list.length} de {CARD_LIST.length} cards
      </p>

      <div className="db-trunk-grid">
        {list.map((c) => {
          const n = counts.get(c.id) ?? 0;
          const max = maxCopies(c.id);
          return (
            <CardTile
              key={c.id}
              cardId={c.id}
              rightClick="add"
              className={n >= max ? 'maxed' : ''}
              badge={n ? <span className="badge count">{max > 1 ? `${n}/${max}` : n}</span> : undefined}
            />
          );
        })}
        {!list.length && <p className="muted db-trunk-empty">Nenhum card com esses filtros.</p>}
      </div>
    </>
  );
}
