import { other } from '../core/board';
import type { CardInstance, GameState } from '../core/types';
import type { EffectCtx } from './types';

export function ctxFor(s: GameState, self: CardInstance, target?: string): EffectCtx {
  // Para cards no campo o "me" é quem controla; usamos o dono (não há troca de controle no jogo).
  return { s, me: self.owner, opp: other(self.owner), self, target };
}
