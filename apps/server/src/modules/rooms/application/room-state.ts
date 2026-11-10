import { getSpectatorView, getView, type GameView, type Seat } from '@devoh/engine';
import type { RoomState } from '@devoh/protocol';
import type { Room } from '../domain/room.js';

function stateOf(room: Room, seat: Seat, view: GameView | null, now: number, catalogRevision: string): RoomState {
  return {
    code: room.code,
    seat,
    status: room.game ? 'playing' : 'waiting',
    players: room.players.map((x, i) =>
      x ? { name: x.name, connected: !!x.socketId, reconnectDeadline: x.reconnectDeadline, eloDelta: room.eloDelta[i] ?? null } : null,
    ),
    rematch: room.rematch,
    view,
    turnDeadline: room.turnDeadline,
    serverNow: now,
    catalogRevision,
  };
}

/** Estado da sala como o jogador do assento `seat` pode ver (mão do oponente escondida). */
export function roomStateFor(room: Room, seat: Seat, now: number, catalogRevision: string): RoomState {
  return stateOf(room, seat, room.game ? getView(room.game, seat) : null, now, catalogRevision);
}

/** Estado da sala para quem assiste: tudo aberto, com o primeiro assento embaixo. */
export function roomStateForSpectator(room: Room, now: number, catalogRevision: string): RoomState {
  return { ...stateOf(room, 0, room.game ? getSpectatorView(room.game, 0) : null, now, catalogRevision), spectator: true };
}
