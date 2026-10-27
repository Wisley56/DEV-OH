import type { BugTrigger, CardInstance, GameState, Seat } from './types';

export interface EffectCtx {
  s: GameState;
  me: Seat;
  opp: Seat;
  self: CardInstance;
  /** iid escolhido pelo jogador (quando o card pede alvo). */
  target?: string;
}

/** Evento que dispara Bugs; os handlers podem marcá-lo como negado ou alterar o dano. */
export interface BugEvent {
  trigger: BugTrigger;
  attacker?: string;
  target?: string;
  summoned?: string;
  task?: string;
  damage?: number;
  destroyed?: string;
  by?: string;
  negated?: boolean;
}

export interface CardEffects {
  /** Retorna mensagem de erro se não puder ativar/usar agora. */
  canActivate?(ctx: EffectCtx): string | null;
  onActivate?(ctx: EffectCtx): void;
  onSummon?(ctx: EffectCtx): void;
  canIgnite?(ctx: EffectCtx): string | null;
  onIgnite?(ctx: EffectCtx): void;
  /** Início do turno do dono, enquanto o card está no campo. */
  onStandby?(ctx: EffectCtx): void;
  /** Depois de ir para o cemitério. byIid = Profissional que destruiu em batalha. */
  onDestroyed?(ctx: EffectCtx, info: { battle: boolean; byIid?: string }): void;
  /** Condição extra de disparo de um Bug. */
  bugCondition?(ctx: EffectCtx, ev: BugEvent): boolean;
  onTrigger?(ctx: EffectCtx, ev: BugEvent): void;
}

export const EFFECTS: Record<string, CardEffects> = {};

export function defineEffects(map: Record<string, CardEffects>) {
  Object.assign(EFFECTS, map);
}
