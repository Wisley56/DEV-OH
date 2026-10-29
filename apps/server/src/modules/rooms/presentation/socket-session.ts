import type { Socket } from 'socket.io';

/** Dados que o servidor guarda em cada socket: a sala em que ele está. */
interface SessionData {
  roomCode?: string;
}

export const roomOf = (socket: Socket) => (socket.data as SessionData).roomCode;

export function setRoom(socket: Socket, code: string | undefined) {
  (socket.data as SessionData).roomCode = code;
}
