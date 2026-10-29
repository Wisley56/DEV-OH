import { cardInfo, RARITIES, type Attribute, type CardDef, type CardKind, type Rarity } from '@devoh/engine';

export type SortKey = 'code' | 'level' | 'atk' | 'rarity';

export interface CollectionFilter {
  kind: CardKind | 'all';
  rarity: Rarity | 'all';
  attribute: Attribute | 'all';
  /** Subtipo legível ("Normal", "Efeito", "FLIP", "Task Rápida", "Contra-Bug"…). */
  subtype: string | 'all';
  level: number | 'all';
  sort: SortKey;
}

export const EMPTY_FILTER: CollectionFilter = { kind: 'all', rarity: 'all', attribute: 'all', subtype: 'all', level: 'all', sort: 'code' };

/** Subtipos que um card exibe nos filtros: o subtipo e, se tiver, "FLIP". */
export function subtypesOf(c: CardDef): string[] {
  const info = cardInfo(c.id);
  return info.flip ? [info.subtype, 'FLIP'] : [info.subtype];
}

export function applyFilter(list: readonly CardDef[], f: CollectionFilter): CardDef[] {
  const order = new Map(list.map((c, i) => [c.id, i]));
  const out = list.filter(
    (c) =>
      (f.kind === 'all' || c.kind === f.kind) &&
      (f.rarity === 'all' || c.rarity === f.rarity) &&
      (f.attribute === 'all' || c.attribute === f.attribute) &&
      (f.subtype === 'all' || subtypesOf(c).includes(f.subtype)) &&
      (f.level === 'all' || c.level === f.level),
  );
  const by: Record<SortKey, (c: CardDef) => number> = {
    code: (c) => order.get(c.id)!,
    level: (c) => -(c.level ?? 0),
    atk: (c) => -(c.atk ?? -1),
    rarity: (c) => -RARITIES.indexOf(c.rarity),
  };
  return out.sort((a, b) => by[f.sort](a) - by[f.sort](b) || order.get(a.id)! - order.get(b.id)!);
}

/** Opções que existem no catálogo (só mostra o que dá resultado). */
export function filterOptions(list: readonly CardDef[]) {
  const subtypes = [...new Set(list.flatMap(subtypesOf))];
  const levels = [...new Set(list.map((c) => c.level).filter((l): l is number => !!l))].sort((a, b) => a - b);
  const attributes = [...new Set(list.map((c) => c.attribute).filter((a): a is Attribute => !!a))];
  return { subtypes, levels, attributes };
}

export function countByRarity(list: readonly CardDef[]): Record<Rarity, number> {
  const out = Object.fromEntries(RARITIES.map((r) => [r, 0])) as Record<Rarity, number>;
  for (const c of list) out[c.rarity]++;
  return out;
}
