import { cardFrame, cardList, statAudit } from '@devoh/engine';

export interface BudgetIssue {
  id: string;
  name: string;
  level: number;
  atk: number;
  def: number;
  /** Ex.: "soma 3300 > 3200", "ATK 2000 > 1900". */
  over: string[];
}

/**
 * Profissionais acima do orçamento de ATK/DEF do nível, pela tabela de balanceamento da engine
 * (a mesma que o criador de cartas usa). Efeito forte conta como orçamento extra: a lista é para
 * revisar caso a caso, não é erro.
 */
export function budgetAudit(): BudgetIssue[] {
  return cardList()
    .filter((c) => c.kind === 'pro')
    .flatMap((c) => {
      const over = statAudit(c, cardFrame(c) !== 'normal');
      return over.length ? [{ id: c.id, name: c.name, level: c.level ?? 1, atk: c.atk ?? 0, def: c.def ?? 0, over }] : [];
    });
}
