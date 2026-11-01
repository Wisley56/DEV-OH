import { card, cardInfo, maxCopies, RARITY_INFO, type BugTrigger, type CardDef, type TargetKind } from '@devoh/engine';

/** Texto legível das regras de um card, para o painel de detalhes do deck builder (funções puras). */

const TARGET: Record<TargetKind, string> = {
  ownPro: 'um Profissional seu',
  oppPro: 'um Profissional do oponente',
  anyPro: 'qualquer Profissional',
  oppSet: 'um card virado do oponente',
};

const TRIGGER: Record<BugTrigger, string> = {
  oppSummon: 'o oponente invoca um Profissional',
  oppAttack: 'o oponente declara um ataque',
  oppDirectAttack: 'o oponente ataca direto',
  oppTask: 'o oponente ativa uma Task',
  battleDamage: 'você vai receber dano de batalha',
  proDestroyedByBattle: 'um Profissional seu é destruído em batalha',
  oppBug: 'um Bug do oponente vai disparar',
};

const SPEED_HELP = {
  normal: 'Usada no seu turno; resolve e sai de campo.',
  continuous: 'Fica em campo e o efeito continua valendo.',
  field: 'Fica em campo e muda as regras do campo.',
  quick: 'Pode ser usada também na fase de Batalha.',
  equip: 'Fica em campo equipada a um Profissional.',
} as const;

const BUG_HELP = {
  normal: 'Fica virado e dispara uma vez.',
  continuous: 'Depois de disparar, fica virado para cima em campo.',
  counter: 'Dispara em resposta a uma ação do oponente.',
} as const;

export interface CardRule {
  label: string;
  value: string;
}

export interface CardDetails {
  def: CardDef;
  code: string;
  rarity: string;
  /** "[Humano / Tech Lead / Efeito]" ou "[Task Rápida]". */
  typeLine: string;
  subtype: string;
  maxCopies: number;
  /** Só Profissionais. */
  stats: { level: number; atk: string; def: string } | null;
  rules: CardRule[];
}

const statText = (v: number | undefined, label?: string) => label ?? (v === undefined ? '?' : String(v));

export function cardDetails(id: string): CardDetails {
  const d = card(id);
  const info = cardInfo(id);
  const rules: CardRule[] = [];

  if (d.kind === 'task') rules.push({ label: info.subtype, value: SPEED_HELP[d.speed ?? 'normal'] });
  if (d.kind === 'bug') rules.push({ label: info.subtype, value: BUG_HELP[d.bugType ?? 'normal'] });
  if (d.trigger) rules.push({ label: 'Dispara quando', value: TRIGGER[d.trigger] });
  if (d.ignition) {
    const alvo = d.ignition.target ? ` · alvo: ${TARGET[d.ignition.target]}` : '';
    rules.push({ label: 'Habilidade', value: `${d.ignition.label} (1x por turno)${alvo}` });
  }
  if (d.target) rules.push({ label: d.targetRequired ? 'Alvo (obrigatório)' : 'Alvo', value: TARGET[d.target] });
  if (info.flip) rules.push({ label: 'FLIP', value: 'Efeito ativa quando o card é virado para cima.' });
  if (d.unique) rules.push({ label: 'Pessoa da squad', value: 'Só 1 cópia por deck.' });

  return {
    def: d,
    code: info.code,
    rarity: RARITY_INFO[d.rarity].label,
    typeLine: info.typeLine,
    subtype: info.subtype,
    maxCopies: maxCopies(id),
    stats: d.kind === 'pro' ? { level: d.level ?? 1, atk: statText(d.atk, d.atkLabel), def: statText(d.def, d.defLabel) } : null,
    rules,
  };
}
