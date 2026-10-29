import { isNegated, other } from '../core/board';
import { effectsOf } from '../core/catalog';
import type { CardInstance, GameState, ProSlot } from '../core/types';
import type { CardEffects, EffectCtx } from './types';

export function ctxFor(s: GameState, self: CardInstance, target?: string): EffectCtx {
  // Para cards no campo o "me" é quem controla; usamos o dono (não há troca de controle no jogo).
  return { s, me: self.owner, opp: other(self.owner), self, target };
}

/** Efeitos de um Profissional no campo — nenhum enquanto estiver anulado. */
export function proEffects(s: GameState, slot: ProSlot): CardEffects | undefined {
  return isNegated(s, slot) ? undefined : effectsOf(slot.card.cardId);
}
