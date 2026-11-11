import type { GameView } from '@devoh/engine';

/** Quanto a abertura fica na tela (o som continua um pouco depois, por baixo do tabuleiro). */
export const INTRO_MS = 4800;
/**
 * Momentos (s) em que a animação acompanha o áudio: a frase, os nomes e o pulso do logo
 * caem nos picos da gravação (≈1,2 s, 2,5 s e 3,7 s).
 */
export const INTRO_BEATS = { tag: 1, names: 2.2, vs: 2.5, pulse: 3.7 };
/** Espera máxima pelo som carregar antes de começar a animação sem ele. */
export const INTRO_SOUND_WAIT_MS = 1500;

/**
 * O duelo acabou de começar: turno 1 e ninguém jogou nada ainda (as linhas do log só ganham
 * `act` a partir da primeira jogada). Quem volta para um duelo em andamento não vê a abertura.
 */
export function isDuelStart(view: GameView): boolean {
  return view.winner === null && view.turn === 1 && !view.log.some((l) => l.act);
}
