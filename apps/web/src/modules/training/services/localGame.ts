import { botAction, type BotLevel } from '@devoh/ai';
import { applyAction, createGame, STARTER_DECKS, type GameState } from '@devoh/engine';

/** Duelo local contra o bot: o jogador é sempre o assento 0. */

export const PLAYER_SEAT = 0;
export const BOT_SEAT = 1;
/** Pausa entre as jogadas do bot, para dar para acompanhar. */
export const BOT_DELAY_MS = 850;

const BOT_NAMES: Record<BotLevel, string[]> = {
  normal: ['Bot Estagiário', 'Bot do Jira', 'IA Alucinada', 'Bot da Daily'],
  hard: ['Dev Sênior Sem IA', 'Arquiteto das Antigas', 'Dev Raiz do Terminal', 'Tech Lead Sem Copilot'],
};

export const LEVEL_LABEL: Record<BotLevel, string> = {
  normal: 'Com IA · Normal',
  hard: 'Sem IA · Difícil',
};

const pick = <T>(list: T[]) => list[Math.floor(Math.random() * list.length)];

export function newLocalGame(deck: string[], playerName: string, level: BotLevel): GameState {
  const botDeck = pick(STARTER_DECKS);
  const botName = `${pick(BOT_NAMES[level])} (${botDeck.name})`;
  return createGame({
    players: [
      { name: playerName, deck },
      { name: botName, deck: botDeck.cards },
    ],
  });
}

/** Próximo estado depois de uma jogada do bot (se ele errar, encerra o turno). */
export function botStep(state: GameState, level: BotLevel): GameState | null {
  let r = applyAction(state, BOT_SEAT, botAction(state, BOT_SEAT, level));
  if (!r.ok) r = applyAction(state, BOT_SEAT, { type: 'endTurn' });
  return r.ok ? r.state : null;
}
