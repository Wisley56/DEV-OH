import type { Action, GameView } from '@devoh/engine';
import type { ReactNode } from 'react';

/**
 * Porta do tabuleiro: quem hospeda o duelo (treino local ou sala online)
 * entrega a visão do jogo e recebe as jogadas.
 */
export interface DuelController {
  view: GameView;
  /** Envia a jogada; resolve com a mensagem de erro, ou null se deu certo. */
  send(action: Action): Promise<string | null> | string | null;
  exit(): void;
  rematch?: () => void;
  rematchLabel?: string;
  /** Aviso no topo da arena (ex.: conexão caiu). */
  banner?: ReactNode;
  /** Selo na linha do meio, ao lado da fase (ex.: dificuldade do bot). */
  badge?: ReactNode;
}
