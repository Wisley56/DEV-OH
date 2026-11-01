import type { BugTrigger, Rarity } from '../core/types';
import type { Trigger } from '../dsl/types';

/**
 * Tabela de balanceamento do DEV-OH! (1 ponto = 100 de ATK/DEF).
 * Base: a curva "vanilla" do Yu-Gi-Oh! (degraus por número de sacrifícios), adaptada a 4000 LP
 * e ao Estresse. É só dado: recalibre aqui e rode os testes de calibração (score.test.ts).
 */

/** Por nível: orçamento de ATK+DEF e teto de ATK. */
export const STAT_CURVE: readonly { maxLevel: number; tributes: number; sum: number; atkCap: number }[] = [
  { maxLevel: 1, tributes: 0, sum: 1400, atkCap: 1000 },
  { maxLevel: 2, tributes: 0, sum: 2000, atkCap: 1300 },
  { maxLevel: 3, tributes: 0, sum: 2600, atkCap: 1600 },
  { maxLevel: 4, tributes: 0, sum: 3200, atkCap: 1900 },
  { maxLevel: 6, tributes: 1, sum: 4300, atkCap: 2400 },
  { maxLevel: 8, tributes: 2, sum: 5300, atkCap: 2800 },
  { maxLevel: 10, tributes: 2, sum: 6000, atkCap: 3000 },
];

/** Profissional Normal (sem efeito) ganha esse multiplicador no orçamento e no teto. */
export const NORMAL_BONUS = 1.1;

/** Pontos de efeito que um Profissional pode gastar, por raridade (além dos atributos). */
export const PRO_EFFECT_ALLOWANCE: Record<Rarity, number> = { comum: 4, rara: 6, super: 8, ultra: 10, secreta: 12 };

/** Bônus no teto de ATK do Profissional, por raridade. */
export const ATK_CAP_BONUS: Record<Rarity, number> = { comum: 0, rara: 0, super: 100, ultra: 200, secreta: 200 };

/** Orçamento total de efeito de Task e Bug, por raridade. */
export const SPELL_BUDGET: Record<Rarity, number> = { comum: 6, rara: 9, super: 12, ultra: 15, secreta: 18 };

/** Quanto o gatilho multiplica o custo das ações do bloco (repetir todo turno vale mais). */
export const TRIGGER_MULT: Record<Exclude<Trigger, 'bug'>, number> = {
  summon: 1,
  flip: 0.8,
  standby: 2.5,
  battleKill: 0.7,
  destroyed: 0.8,
  ignition: 2.5,
  activate: 1,
  endTurn: 2.5,
};

/** Bug: quanto mais raro o evento, mais barato (pode nunca disparar). */
export const BUG_TRIGGER_MULT: Record<BugTrigger, number> = {
  oppSummon: 0.8,
  oppAttack: 0.8,
  oppDirectAttack: 0.6,
  oppTask: 0.7,
  battleDamage: 0.8,
  proDestroyedByBattle: 0.6,
  oppBug: 0.7,
};

/** Cada condição fixa barateia o bloco; a chance multiplica pelo próprio percentual. */
export const CONDITION_MULT = 0.8;

/** Custo das ações (antes do multiplicador do gatilho). */
export const COST = {
  /** por 100 LP: dano vale o dobro do Yu-Gi-Oh!, porque aqui o jogo começa com 4000. */
  damagePer100: 0.5,
  selfDamagePer100: -0.25,
  healPer100: 0.25,
  stressOppUp: 1.5,
  stressOppDown: -1,
  stressMeDown: 1,
  stressMeUp: -0.75,
  stressBothUp: 0.5,
  stressBothDown: 0.25,
  draw: 3,
  search: 3,
  /** por 100 de ATK até o fim do turno, a favor (contra = metade, negativo). */
  tempAtkPer100: 0.4,
  /** por 100 de ATK/DEF permanentes. */
  modStatsPer100: 0.8,
  destroy: { chosen: 7, strongestOpp: 9, weakestOpp: 5, randomOpp: 6, event: 7, self: -2, strongestMine: -3, weakestMine: -2 },
  /** Devolver à mão vale uma fração de destruir. */
  bounceRatio: 0.6,
  position: 2,
  negate: 3,
  destroySet: 3,
  negateEvent: 5,
  revealSets: 1,
} as const;

/** Custo dos efeitos contínuos. */
export const PASSIVE_COST = {
  equipPer100: 0.6,
  auraPer100: 1.5,
  selfAtkPer100: 1,
  battleSave: 4,
  shield: 3,
  guard: 4,
} as const;

export function statRow(level: number) {
  return STAT_CURVE.find((r) => level <= r.maxLevel) ?? STAT_CURVE[STAT_CURVE.length - 1];
}
