import type { Action } from '@devoh/engine';
import { EVENTS, type Ack, type RoomState } from '@devoh/protocol';
import { io, type Socket } from 'socket.io-client';
import { SERVER_URL } from '../../../shared/lib/env';
import { getSession, setSession } from './session';

/** Como entrar na sala: criar, entrar com apelido/deck ou só reconectar pela sessão salva. */
export type RoomIntent =
  | { kind: 'create'; name: string; deck: string[]; private?: boolean }
  | { kind: 'join'; code: string; name: string; deck: string[] }
  | { kind: 'rejoin'; code: string };

export type ConnectionStatus = 'connecting' | 'ready' | 'offline' | 'error';

export interface RoomClientEvents {
  state(room: RoomState): void;
  status(status: ConnectionStatus): void;
  error(message: string): void;
  /** Entrou na sala (código definitivo, ex.: depois de criar). */
  entered(code: string): void;
  /** Não há sessão válida para reconectar: precisa entrar com apelido e deck. */
  needsJoin(): void;
}

/** Cliente Socket.IO de uma sala: conecta, entra, reconecta pelo token e envia jogadas. */
export class RoomClient {
  private socket: Socket | null = null;
  private joined = false;

  constructor(private readonly on: RoomClientEvents) {}

  connect(intent: RoomIntent) {
    const s = io(SERVER_URL, { transports: ['websocket', 'polling'] });
    this.socket = s;
    s.on('connect', () => this.enter(intent));
    s.on('disconnect', () => this.on.status('offline'));
    s.on('connect_error', () => {
      this.on.status('offline');
      this.on.error(`Não consegui falar com o servidor (${SERVER_URL}).`);
    });
    s.on(EVENTS.roomState, (r: RoomState) => this.on.state(r));
  }

  /** Ao (re)conectar: usa o token salvo se for a mesma sala; senão entra do zero. */
  private enter(intent: RoomIntent) {
    const saved = getSession();
    const code = intent.kind === 'create' ? undefined : intent.code.toUpperCase();
    if (saved && (this.joined || (code && saved.code === code))) {
      this.socket?.emit(EVENTS.rejoinRoom, saved, (ack: Ack) => {
        if (ack.ok) {
          this.joined = true;
          this.on.entered(saved.code);
          this.on.status('ready');
        } else if (!this.joined) {
          setSession(null);
          this.enterFresh(intent);
        } else {
          this.on.status('error');
          this.on.error(ack.error);
        }
      });
      return;
    }
    this.enterFresh(intent);
  }

  private enterFresh(intent: RoomIntent) {
    if (intent.kind === 'rejoin') return this.on.needsJoin();
    const [event, payload] =
      intent.kind === 'create'
        ? [EVENTS.createRoom, { name: intent.name, deck: intent.deck, private: intent.private }]
        : [EVENTS.joinRoom, { code: intent.code.toUpperCase(), name: intent.name, deck: intent.deck }];
    this.socket?.emit(event, payload, (ack: Ack) => {
      if (ack.ok && ack.code && ack.token) {
        this.joined = true;
        setSession({ code: ack.code, token: ack.token });
        this.on.entered(ack.code);
        this.on.status('ready');
      } else if (!ack.ok) {
        this.on.status('error');
        this.on.error(ack.error);
      }
    });
  }

  send(action: Action) {
    return new Promise<string | null>((resolve) => {
      if (!this.socket?.connected) return resolve('Sem conexão com o servidor.');
      this.socket.emit(EVENTS.action, action, (ack: Ack) => resolve(ack.ok ? null : ack.error));
    });
  }

  rematch() {
    this.socket?.emit(EVENTS.rematch);
  }

  /** Sai da sala de vez (não volta mais pelo token). */
  leave() {
    this.socket?.emit(EVENTS.leaveRoom);
    setSession(null);
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }
}
