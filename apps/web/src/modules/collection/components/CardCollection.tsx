import { CARD_LIST, RARITIES, RARITY_INFO, type CardKind } from '@devoh/engine';
import { useMemo, useState } from 'react';
import { PageHead } from '../../../shared/ui';
import { ATTR, CardFull } from '../../cards';
import { applyFilter, countByRarity, EMPTY_FILTER, filterOptions, type CollectionFilter, type SortKey } from '../services/collectionFilter';

const TABS: { id: CardKind | 'all'; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'pro', label: 'Profissionais' },
  { id: 'task', label: 'Tasks' },
  { id: 'bug', label: 'Bugs' },
];

const SORTS: { id: SortKey; label: string }[] = [
  { id: 'code', label: 'Código' },
  { id: 'rarity', label: 'Raridade' },
  { id: 'level', label: 'Nível' },
  { id: 'atk', label: 'ATK' },
];

const OPTIONS = filterOptions(CARD_LIST);
const COUNTS = countByRarity(CARD_LIST);

/** Todos os cards do jogo, com filtros por tipo, raridade, atributo, subtipo e nível. */
export function CardCollection() {
  const [f, setF] = useState<CollectionFilter>(EMPTY_FILTER);
  const list = useMemo(() => applyFilter(CARD_LIST, f), [f]);
  const set = <K extends keyof CollectionFilter>(k: K, v: CollectionFilter[K]) => setF((x) => ({ ...x, [k]: v }));
  const all = (v: string) => (v === 'all' ? 'all' : v);
  return (
    <>
      <PageHead title="Coleção">
        <div className="tabs">
          {TABS.map((t) => (
            <button key={t.id} className={`tab ${f.kind === t.id ? 'on' : ''}`} onClick={() => set('kind', t.id)}>
              {t.label}
            </button>
          ))}
        </div>
      </PageHead>
      <div className="collection-filters">
        <label>
          Raridade
          <select value={f.rarity} onChange={(e) => set('rarity', all(e.target.value) as CollectionFilter['rarity'])}>
            <option value="all">Todas</option>
            {RARITIES.map((r) => (
              <option key={r} value={r}>
                {RARITY_INFO[r].label} ({COUNTS[r]})
              </option>
            ))}
          </select>
        </label>
        <label>
          Tipo
          <select value={f.subtype} onChange={(e) => set('subtype', e.target.value)}>
            <option value="all">Todos</option>
            {OPTIONS.subtypes.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label>
          Atributo
          <select value={f.attribute} onChange={(e) => set('attribute', all(e.target.value) as CollectionFilter['attribute'])}>
            <option value="all">Todos</option>
            {OPTIONS.attributes.map((a) => (
              <option key={a} value={a}>
                {ATTR[a].label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Nível
          <select value={f.level} onChange={(e) => set('level', e.target.value === 'all' ? 'all' : Number(e.target.value))}>
            <option value="all">Todos</option>
            {OPTIONS.levels.map((l) => (
              <option key={l} value={l}>
                ⭐ {l}
              </option>
            ))}
          </select>
        </label>
        <label>
          Ordenar
          <select value={f.sort} onChange={(e) => set('sort', e.target.value as SortKey)}>
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <span className="muted collection-count">
          {list.length} de {CARD_LIST.length} cards
          {list.length !== CARD_LIST.length && (
            <button className="link-btn" onClick={() => setF(EMPTY_FILTER)}>
              limpar
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
