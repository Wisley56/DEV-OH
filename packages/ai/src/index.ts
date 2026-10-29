import type { Action, GameState, Seat } from '@devoh/engine';
import { hardBotAction } from './hard';
import { normalBotAction } from './normal';

/** "Com IA" = normal (heurístico simples); "Sem IA" = difícil (simula cada jogada). */
export type BotLevel = 'normal' | 'hard';

export const BOT_LEVELS: readonly BotLevel[] = ['normal', 'hard'];

export function botAction(s: GameState, seat: Seat, level: BotLevel = 'normal'): Action {
  return level === 'hard' ? hardBotAction(s, seat, normalBotAction) : normalBotAction(s, seat);
}
