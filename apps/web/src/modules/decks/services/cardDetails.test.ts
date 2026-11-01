import { BASE_CARD_LIST, cardInfo, maxCopies } from '@devoh/engine';
import { describe, expect, it } from 'vitest';
import { cardDetails } from './cardDetails';

const find = (pred: (c: (typeof BASE_CARD_LIST)[number]) => boolean) => BASE_CARD_LIST.find(pred)!;

describe('detalhes do card em texto', () => {
  it('Profissional: nível, ATK/DEF, tipo, raridade e limite de cópias', () => {
    const c = find((x) => x.kind === 'pro' && x.atk !== undefined);
    const info = cardDetails(c.id);
    expect(info.stats).toEqual({ level: c.level ?? 1, atk: c.atkLabel ?? String(c.atk), def: c.defLabel ?? String(c.def ?? '?') });
    expect(info.typeLine).toBe(cardInfo(c.id).typeLine);
    expect(info.code).toMatch(/^DVOH-\d{3}$/);
    expect(info.maxCopies).toBe(maxCopies(c.id));
  });

  it('Task e Bug não têm status e explicam o subtipo', () => {
    for (const kind of ['task', 'bug'] as const) {
      const c = find((x) => x.kind === kind);
      const info = cardDetails(c.id);
      expect(info.stats).toBeNull();
      expect(info.rules[0].label).toBe(info.subtype);
      expect(info.rules[0].value.length).toBeGreaterThan(5);
    }
  });

  it('mostra gatilho, habilidade, alvo e pessoa da squad quando houver', () => {
    const labels = (pred: Parameters<typeof find>[0]) => cardDetails(find(pred).id).rules.map((r) => r.label);
    expect(labels((x) => !!x.trigger)).toContain('Dispara quando');
    expect(labels((x) => !!x.ignition)).toContain('Habilidade');
    expect(labels((x) => !!x.target).some((l) => l.startsWith('Alvo'))).toBe(true);
    expect(labels((x) => !!x.unique)).toContain('Pessoa da squad');
  });

  it('todo card do catálogo gera detalhes sem textos vazios', () => {
    for (const c of BASE_CARD_LIST) {
      for (const r of cardDetails(c.id).rules) {
        expect(r.label, c.id).toBeTruthy();
        expect(r.value, c.id).not.toMatch(/undefined/);
      }
    }
  });
});
