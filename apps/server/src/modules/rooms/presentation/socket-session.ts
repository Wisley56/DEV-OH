import type { Socket } from 'socket.io';
import type { Player } from '../application/ports.js';

/** Dados que o servidor guarda em cada socket: a conta (do cookie, no handshake), a sala ou o torneio. */
interface SessionData {
  player?: Player;
  roomCode?: string;
  /** Torneio em que está inscrito (os duelos dele são salas próprias, ligadas pelo torneio). */
  tournamentCode?: string;
}

export const roomOf = (socket: Socket) => (socket.data as SessionData).roomCode;

export function setRoom(socket: Socket, code: string | undefined) {
  (socket.data as SessionData).roomCode = code;
}

export const tournamentOf = (socket: Socket) => (socket.data as SessionData).tournamentCode;

export function setTournament(socket: Socket, code: string | undefined) {
  (socket.data as SessionData).tournamentCode = code;
}

/** Conta do socket. O handshake sem sessão é recusado, então sempre existe aqui. */
export const playerOf = (socket: Socket) => (socket.data as SessionData).player!;

export function setPlayer(socket: Socket, player: Player) {
  (socket.data as SessionData).player = player;
}
