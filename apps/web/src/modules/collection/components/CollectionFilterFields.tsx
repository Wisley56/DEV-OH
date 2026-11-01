import { cardList, RARITIES, RARITY_INFO, type CardKind } from '@devoh/engine';
import { useMemo } from 'react';
import { ATTR, useCatalogRevision } from '../../cards';
import { countByRarity, filterOptions, type CollectionFilter, type SortKey } from '../services/collectionFilter';

export const KIND_TABS: { id: CardKind | 'all'; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'pro', label: 'Profissionais' },
  { id: 'task', label: 'Tasks' },
  { id: 'bug', label: 'Bugs' },
];

export const SORTS: { id: SortKey; label: string }[] = [
  { id: 'code', label: 'Código' },
  { id: 'rarity', label: 'Raridade' },
  { id: 'level', label: 'Nível' },
  { id: 'atk', label: 'ATK' },
];

/** Campos de filtro dos cards (tipo opcional, raridade, subtipo, atributo, nível e ordenação). */
export function CollectionFilterFields({
  value: f,
  onChange,
  withKind = false,
  withSort = true,
}: {
  value: CollectionFilter;
  onChange(next: CollectionFilter): void;
  /** Mostra o tipo de card como select (a Coleção usa abas no cabeçalho). */
  withKind?: boolean;
  withSort?: boolean;
}) {
  const revision = useCatalogRevision();
  const { OPTIONS, COUNTS } = useMemo(
    () => (void revision, { OPTIONS: filterOptions(cardList()), COUNTS: countByRarity(cardList()) }),
    [revision],
  );
  const set = <K extends keyof CollectionFilter>(k: K, v: CollectionFilter[K]) => onChange({ ...f, [k]: v });
  return (
    <>
      {withKind && (
        <label>
          Card
          <select value={f.kind} onChange={(e) => set('kind', e.target.value as CollectionFilter['kind'])}>
            {KIND_TABS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
      )}
      <label>
        Raridade
        <select value={f.rarity} onChange={(e) => set('rarity', e.target.value as CollectionFilter['rarity'])}>
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
        <select value={f.attribute} onChange={(e) => set('attribute', e.target.value as CollectionFilter['attribute'])}>
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
              Nível {l}
            </option>
          ))}
        </select>
      </label>
      {withSort && (
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
      )}
    </>
  );
}
