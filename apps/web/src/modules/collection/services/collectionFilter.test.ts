import { CARD_LIST } from '@devoh/engine';
import { describe, expect, it } from 'vitest';
import { applyFilter, countByRarity, EMPTY_FILTER, filterOptions } from './collectionFilter';

describe('filtro da coleção', () => {
  it('sem filtro devolve tudo na ordem da coleção', () => {
    expect(applyFilter(CARD_LIST, EMPTY_FILTER).map((c) => c.id)).toEqual(CARD_LIST.map((c) => c.id));
  });

  it('combina tipo, raridade e nível', () => {
    const out = applyFilter(CARD_LIST, { ...EMPTY_FILTER, kind: 'pro', rarity: 'secreta' });
    expect(out.map((c) => c.id).sort()).toEqual(['ceo', 'diegao', 'thy_techlead']);
    expect(
      applyFilter(CARD_LIST, { ...EMPTY_FILTER, level: 9 })
        .map((c) => c.id)
        .sort(),
    ).toEqual(['ceo', 'diegao']);
  });

  it('filtra por subtipo derivado', () => {
    const normals = applyFilter(CARD_LIST, { ...EMPTY_FILTER, subtype: 'Normal' });
    expect(normals.every((c) => c.kind === 'pro')).toBe(true);
    expect(normals.map((c) => c.id)).toContain('backend_noturno');
    expect(applyFilter(CARD_LIST, { ...EMPTY_FILTER, subtype: 'Contra-Bug' }).map((c) => c.id)).toContain('merge_conflict');
  });

  it('ordena por ATK decrescente', () => {
    const out = applyFilter(CARD_LIST, { ...EMPTY_FILTER, kind: 'pro', sort: 'atk' });
    for (let i = 1; i < out.length; i++) expect(out[i - 1].atk!).toBeGreaterThanOrEqual(out[i].atk!);
  });

  it('opções e contagem por raridade', () => {
    const o = filterOptions(CARD_LIST);
    expect(o.subtypes).toContain('Efeito');
    expect(o.levels[0]).toBeGreaterThan(0);
    const n = countByRarity(CARD_LIST);
    expect(Object.values(n).reduce((a, b) => a + b, 0)).toBe(CARD_LIST.length);
  });
});
