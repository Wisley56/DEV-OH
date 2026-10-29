import type { Seat } from '@devoh/engine';
import { sfx } from '../../../sound';
import type { BoardEvent } from '../../services/boardEvents';
import { DICE_ROLL_MS } from './Dice';

let lastKind: BoardEvent['kind'] | null = null;

/** Som de cada evento do tabuleiro (chamado pela FxLayer, um evento por vez). */
export function playBoardSound(ev: BoardEvent, you: Seat) {
  const prev = lastKind;
  lastKind = ev.kind;
  switch (ev.kind) {
    case 'attack':
      return sfx.play('attack');
    case 'hit':
      return sfx.play('hit');
    case 'block':
      return sfx.play('block');
    case 'damage':
      // Dano logo depois do golpe já tocou o impacto; dano de efeito tem som próprio.
      return prev === 'hit' ? undefined : sfx.play('hit');
    case 'heal':
      return sfx.play('heal');
    case 'destroy':
      return sfx.play('destroy');
    case 'reveal':
      sfx.play('reveal');
      return sfx.play('glitch');
    case 'flip':
      return sfx.play('reveal');
    case 'activate':
      return sfx.play('task');
    case 'summon':
      return sfx.play('summon');
    case 'set':
      return sfx.play('set');
    case 'dice':
      sfx.play('dice-shake');
      // O dado cai na mesa quando a animação para de rolar (ver DICE_ROLL_MS).
      setTimeout(() => sfx.play('dice-throw'), DICE_ROLL_MS);
      return;
    case 'turn':
      return ev.seat === you ? sfx.play('turn') : undefined;
    case 'end':
      return sfx.play(ev.winner === you ? 'win' : 'lose');
  }
}
