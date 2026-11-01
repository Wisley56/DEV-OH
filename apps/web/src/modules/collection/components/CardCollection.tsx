import { cardList } from '@devoh/engine';
import { useMemo, useState } from 'react';
import { PageHead } from '../../../shared/ui';
import { CardFull, useCatalogRevision } from '../../cards';
import { applyFilter, EMPTY_FILTER, type CollectionFilter } from '../services/collectionFilter';
import { CollectionFilterFields, KIND_TABS } from './CollectionFilterFields';

/** Todos os cards do jogo, com filtros por tipo, raridade, atributo, subtipo e nível. */
export function CardCollection() {
  const [f, setF] = useState<CollectionFilter>(EMPTY_FILTER);
  const revision = useCatalogRevision();
  const all = useMemo(() => (void revision, cardList()), [revision]);
  const list = useMemo(() => applyFilter(all, f), [all, f]);
  return (
    <>
      <PageHead title="Coleção">
        <div className="tabs" role="tablist" aria-label="Tipo de card">
          {KIND_TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={f.kind === t.id}
              className={`tab ${f.kind === t.id ? 'on' : ''}`}
              onClick={() => setF({ ...f, kind: t.id })}
            >
              {t.label}
            </button>
          ))}
        </div>
      </PageHead>
      <div className="collection-filters">
        <CollectionFilterFields value={f} onChange={setF} />
        <span className="collection-count">
          <span className="mono">
            {list.length} de {all.length} cards
          </span>
          {list.length !== all.length && (
            <button className="link-btn" onClick={() => setF(EMPTY_FILTER)}>
              Limpar
            </button>
          )}
        </span>
      </div>
      <div className="collection-grid">
        {list.map((c) => (
          <CardFull key={c.id} cardId={c.id} />
        ))}
      </div>
      {!list.length && <p className="muted">Nenhum card com esses filtros.</p>}
    </>
  );
}
