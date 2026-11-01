import type { Attribute, CardKind } from '../core/types';

/**
 * Efeitos em blocos: o que o criador de cartas monta e a engine interpreta (compile.ts).
 * Um bloco é "quando X [se Y]: faça A, B". Passivos ficam ligados enquanto o card está no campo.
 */

export type Side = 'me' | 'opp' | 'both';

/** Quando um bloco dispara. Profissional, Task e Bug aceitam gatilhos diferentes (rules.ts). */
export type Trigger =
  // Profissional
  | 'summon'
  | 'flip'
  | 'standby'
  | 'battleKill'
  | 'destroyed'
  | 'ignition'
  // Task
  | 'activate'
  | 'endTurn'
  // Bug: dispara pelo `trigger` do card
  | 'bug';

/** Em quem a ação cai. */
export type TargetRef =
  | 'chosen' // o alvo escolhido ao ativar (Task ou efeito ativável)
  | 'self' // o próprio Profissional
  | 'event' // do evento do Bug: o atacante, o invocado ou quem destruiu
  | 'strongestOpp'
  | 'weakestOpp'
  | 'randomOpp'
  | 'strongestMine'
  | 'weakestMine';

export type EffectAction =
  | { do: 'damage'; amount: number }
  | { do: 'selfDamage'; amount: number }
  | { do: 'heal'; amount: number }
  /** Positivo aumenta, negativo alivia. */
  | { do: 'stress'; side: Side; amount: number }
  | { do: 'draw'; amount: number }
  /** Um card aleatório desse tipo do seu deck vai para a mão. */
  | { do: 'search'; kind: CardKind }
  /** Até o fim do turno. */
  | { do: 'tempAtk'; target: TargetRef; amount: number }
  /** Permanente, enquanto o Profissional estiver no campo. */
  | { do: 'modStats'; target: TargetRef; atk: number; def: number }
  | { do: 'destroy'; target: TargetRef }
  | { do: 'bounce'; target: TargetRef }
  | { do: 'position'; target: TargetRef }
  /** Anula os efeitos até o fim do próximo turno. */
  | { do: 'negate'; target: TargetRef }
  /** Destrói 1 Task/Bug virado aleatório do oponente. */
  | { do: 'destroySet' }
  /** Só em Bug: anula o ataque, a Task ou o Bug do evento, ou zera o dano de batalha. */
  | { do: 'negateEvent' }
  /** Revela os cards virados do oponente. */
  | { do: 'revealSets' };

export type Condition =
  | { if: 'stressAtLeast'; side: 'me' | 'opp'; n: number }
  | { if: 'lpAtMost'; side: 'me' | 'opp'; n: number }
  | { if: 'controlsAttr'; attr: Attribute }
  | { if: 'oppHasPros' }
  | { if: 'chance'; pct: number };

export interface EffectBlock {
  when: Trigger;
  if?: Condition[];
  do: EffectAction[];
  /** Nome do botão do efeito ativável (ignition). */
  label?: string;
}

export type Passive =
  /** Task de Equipamento: bônus no Profissional equipado. */
  | { passive: 'equip'; atk: number; def: number }
  /** Seus Profissionais (me, só ATK) ou os do oponente (opp) ganham/perdem. */
  | { passive: 'aura'; side: 'me' | 'opp'; atk: number; def: number }
  | { passive: 'selfAtk'; amount: number }
  /** 1x por turno, não é destruído em batalha. */
  | { passive: 'battleSave' }
  /** O dono não recebe dano de batalha das batalhas dele. */
  | { passive: 'shield' }
  /** 1x por turno, anula um ataque contra ele. */
  | { passive: 'guard' };

export type EffectPart = EffectBlock | Passive;

export const isPassive = (p: EffectPart): p is Passive => 'passive' in p;
