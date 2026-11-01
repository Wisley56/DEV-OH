import { BASE_CARD_LIST } from '@devoh/engine';
import { describe, expect, it } from 'vitest';
import { activeFilters, applyFilter, countByRarity, EMPTY_FILTER, filterOptions } from './collectionFilter';

describe('filtro da coleção', () => {
  it('sem filtro devolve tudo na ordem da coleção', () => {
    expect(applyFilter(BASE_CARD_LIST, EMPTY_FILTER).map((c) => c.id)).toEqual(BASE_CARD_LIST.map((c) => c.id));
  });

  it('combina tipo, raridade e nível', () => {
    const out = applyFilter(BASE_CARD_LIST, { ...EMPTY_FILTER, kind: 'pro', rarity: 'secreta' });
    expect(out.map((c) => c.id).sort()).toEqual(['ceo', 'diegao', 'thy_techlead']);
    expect(
      applyFilter(BASE_CARD_LIST, { ...EMPTY_FILTER, level: 9 })
        .map((c) => c.id)
        .sort(),
    ).toEqual(['ceo', 'diegao']);
  });

  it('filtra por subtipo derivado', () => {
    const normals = applyFilter(BASE_CARD_LIST, { ...EMPTY_FILTER, subtype: 'Normal' });
    expect(normals.every((c) => c.kind === 'pro')).toBe(true);
    expect(normals.map((c) => c.id)).toContain('backend_noturno');
    expect(applyFilter(BASE_CARD_LIST, { ...EMPTY_FILTER, subtype: 'Contra-Bug' }).map((c) => c.id)).toContain('merge_conflict');
  });

  it('ordena por ATK decrescente', () => {
    const out = applyFilter(BASE_CARD_LIST, { ...EMPTY_FILTER, kind: 'pro', sort: 'atk' });
    for (let i = 1; i < out.length; i++) expect(out[i - 1].atk!).toBeGreaterThanOrEqual(out[i].atk!);
  });

  it('opções e contagem por raridade', () => {
    const o = filterOptions(BASE_CARD_LIST);
    expect(o.subtypes).toContain('Efeito');
    expect(o.levels[0]).toBeGreaterThan(0);
    const n = countByRarity(BASE_CARD_LIST);
    expect(Object.values(n).reduce((a, b) => a + b, 0)).toBe(BASE_CARD_LIST.length);
  });

  it('busca no nome e no texto, sem maiúsculas nem acentos', () => {
    const c = BASE_CARD_LIST.find((x) => /[áéíóúãõç]/i.test(x.name)) ?? BASE_CARD_LIST[0];
    const plain = c.name
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toUpperCase();
    expect(applyFilter(BASE_CARD_LIST, { ...EMPTY_FILTER, query: plain }).map((x) => x.id)).toContain(c.id);
    const word = BASE_CARD_LIST[1].text.split(/\s+/).find((w) => w.length > 5)!;
    expect(applyFilter(BASE_CARD_LIST, { ...EMPTY_FILTER, query: word }).map((x) => x.id)).toContain(BASE_CARD_LIST[1].id);
    expect(applyFilter(BASE_CARD_LIST, { ...EMPTY_FILTER, query: 'zzzz-nada' })).toEqual([]);
  });

  it('conta filtros ativos sem busca e ordenação', () => {
    expect(activeFilters(EMPTY_FILTER)).toBe(0);
    expect(activeFilters({ ...EMPTY_FILTER, kind: 'pro', level: 4, query: 'x', sort: 'atk' })).toBe(2);
  });
});
