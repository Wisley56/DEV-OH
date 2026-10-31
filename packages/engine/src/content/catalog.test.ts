import { describe, expect, it } from 'vitest';
import { CARD_LIST, cardFrame, fullTypeLine, maxCopies, RARITIES, setCode, STARTER_DECKS, validateDeck } from '../index';

describe('catálogo', () => {
  it('todo card tem raridade válida', () => {
    for (const c of CARD_LIST) expect(RARITIES, c.id).toContain(c.rarity);
  });

  it('Normal/Efeito/subtipo são derivados, não escritos no typeLine', () => {
    for (const c of CARD_LIST) expect(c.typeLine ?? '', c.id).not.toMatch(/\b(Efeito|Normal|FLIP|Task|Bug)\b/);
  });

  it('Profissionais têm raça/função, nível e stats', () => {
    for (const c of CARD_LIST.filter((x) => x.kind === 'pro')) {
      expect(c.typeLine, c.id).toBeTruthy();
      expect(c.level, c.id).toBeGreaterThan(0);
      expect(c.atk, c.id).toBeTypeOf('number');
      expect(c.def, c.id).toBeTypeOf('number');
    }
  });

  it('só Bugs têm bugType; trigger só em Bugs e Tasks que podem ser baixadas; só Tasks têm speed', () => {
    for (const c of CARD_LIST) {
      if (c.kind !== 'bug') expect(c.bugType, c.id).toBeUndefined();
      if (c.kind === 'pro' || c.speed === 'field') expect(c.trigger, c.id).toBeUndefined();
      if (c.kind === 'bug') expect(c.trigger, c.id).toBeDefined();
      if (c.kind !== 'task') expect(c.speed, c.id).toBeUndefined();
    }
  });

  it('linha de tipo e código de coleção', () => {
    expect(fullTypeLine(CARD_LIST.find((c) => c.id === 'thy_techlead')!)).toBe('Humano / Tech Lead / Efeito');
    expect(fullTypeLine(CARD_LIST.find((c) => c.id === 'backend_noturno')!)).toBe('Humano / Dev / Normal');
    expect(fullTypeLine(CARD_LIST.find((c) => c.id === 'deploy_sexta')!)).toBe('Task / Alto Risco');
    expect(fullTypeLine(CARD_LIST.find((c) => c.id === 'merge_conflict')!)).toBe('Contra-Bug');
    expect(cardFrame(CARD_LIST.find((c) => c.id === 'backend_noturno')!)).toBe('normal');
    expect(setCode(CARD_LIST[0].id)).toBe('DVOH-001');
    expect(setCode('moises_bombado')).toBe('DVOH-056');
  });

  it('limite de cópias pela raridade', () => {
    for (const c of CARD_LIST) {
      const want = c.unique || c.rarity === 'ultra' || c.rarity === 'secreta' ? 1 : c.rarity === 'super' ? 2 : 3;
      expect(maxCopies(c.id), c.id).toBe(want);
    }
  });

  it('decks iniciais são válidos', () => {
    for (const d of STARTER_DECKS) expect(validateDeck(d.cards), d.id).toEqual([]);
  });
});
