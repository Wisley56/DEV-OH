import { cardList, cardFrame } from '@devoh/engine';

/**
 * Orçamento de referência por nível: soma ATK+DEF e teto de ATK (Normal ganha +10%).
 * Efeito forte conta como orçamento extra — a lista é para revisar caso a caso, não é erro.
 */
const BUDGET: { max: number; sum: number; atk?: number }[] = [
  { max: 2, sum: 2000 },
  { max: 3, sum: 2600 },
  { max: 4, sum: 3200, atk: 1900 },
  { max: 6, sum: 4300, atk: 2400 },
  { max: 8, sum: 5300 },
  { max: 99, sum: 6000 },
];

export interface BudgetIssue {
  id: string;
  name: string;
  level: number;
  atk: number;
  def: number;
  /** Ex.: "soma 3300 > 3200", "ATK 2000 > 1900". */
  over: string[];
}

/** Profissionais acima do orçamento de ATK/DEF do nível. */
export function budgetAudit(): BudgetIssue[] {
  return cardList()
    .filter((c) => c.kind === 'pro')
    .flatMap((c) => {
      const level = c.level ?? 1;
      const b = BUDGET.find((x) => level <= x.max)!;
      const atk = c.atk ?? 0;
      const def = c.def ?? 0;
      const bonus = cardFrame(c) === 'normal' ? 1.1 : 1;
      const limit = Math.round(b.sum * bonus);
      const atkCap = b.atk && Math.round(b.atk * bonus);
      const over: string[] = [];
      if (atk + def > limit) over.push(`soma ${atk + def} > ${limit}`);
      if (atkCap && atk > atkCap) over.push(`ATK ${atk} > ${atkCap}`);
      return over.length ? [{ id: c.id, name: c.name, level, atk, def, over }] : [];
    });
}
