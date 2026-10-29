import { getView, type Seat } from '@devoh/engine';
import type { RoomState } from '@devoh/protocol';
import type { Room } from '../domain/room.js';

/** Estado da sala como o jogador do assento `seat` pode ver (mão do oponente escondida). */
export function roomStateFor(room: Room, seat: Seat, now: number): RoomState {
  return {
    code: room.code,
    seat,
    status: room.game ? 'playing' : 'waiting',
    players: room.players.map((x) => (x ? { name: x.name, connected: !!x.socketId, reconnectDeadline: x.reconnectDeadline } : null)),
    rematch: room.rematch,
    view: room.game ? getView(room.game, seat) : null,
    turnDeadline: room.turnDeadline,
    serverNow: now,
  };
}
