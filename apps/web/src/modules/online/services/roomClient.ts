import type { Action } from '@devoh/engine';
import { EVENTS, type Ack, type RoomState } from '@devoh/protocol';
import { io, type Socket } from 'socket.io-client';
import { setActiveRoom } from './session';

/** Como entrar na sala: criar, entrar com um deck ou só voltar para o próprio assento. */
export type RoomIntent =
  { kind: 'create'; deck: string[]; private?: boolean } | { kind: 'join'; code: string; deck: string[] } | { kind: 'rejoin'; code: string };

export type ConnectionStatus = 'connecting' | 'ready' | 'offline' | 'error';

export interface RoomClientEvents {
  state(room: RoomState): void;
  status(status: ConnectionStatus): void;
  error(message: string): void;
  /** Entrou na sala (código definitivo, ex.: depois de criar). */
  entered(code: string): void;
  /** A conta não tem lugar nesta sala: precisa entrar escolhendo um deck. */
  needsJoin(): void;
}

/**
 * Cliente Socket.IO de uma sala: conecta, entra, reconecta e envia jogadas. Quem a pessoa
 * é vem do cookie de sessão no handshake; a volta depois de cair é pela conta.
 */
export class RoomClient {
  private socket: Socket | null = null;
  /** Sala em que já entrou: ao reconectar, só volta para o assento. */
  private code: string | null = null;

  constructor(private readonly on: RoomClientEvents) {}

  connect(intent: RoomIntent) {
    // Mesma origem do site (o proxy repassa /socket.io): o cookie de sessão vai junto no handshake.
    const s = io({ transports: ['websocket', 'polling'] });
    this.socket = s;
    s.on('connect', () => this.enter(intent));
    s.on('disconnect', () => this.on.status('offline'));
    s.on('connect_error', (err) => {
      this.on.status('offline');
      this.on.error(
        err.message && !/websocket|xhr|timeout/i.test(err.message) ? err.message : 'Não consegui falar com o servidor de duelos.',
      );
    });
    s.on(EVENTS.roomState, (r: RoomState) => this.on.state(r));
  }

  /** Ao (re)conectar: tenta voltar para o próprio assento; se não houver, cria ou entra. */
  private enter(intent: RoomIntent) {
    const code = this.code ?? (intent.kind === 'create' ? null : intent.code.toUpperCase());
    if (!code) return this.enterFresh(intent);
    this.socket?.emit(EVENTS.rejoinRoom, { code }, (ack: Ack) => {
      if (ack.ok) return this.entered(code);
      if (!this.code) return this.enterFresh(intent);
      this.on.status('error');
      this.on.error(ack.error);
    });
  }

  private enterFresh(intent: RoomIntent) {
    if (intent.kind === 'rejoin') return this.on.needsJoin();
    const [event, payload] =
      intent.kind === 'create'
        ? [EVENTS.createRoom, { deck: intent.deck, private: intent.private }]
        : [EVENTS.joinRoom, { code: intent.code.toUpperCase(), deck: intent.deck }];
    this.socket?.emit(event, payload, (ack: Ack) => {
      if (ack.ok && ack.code) this.entered(ack.code);
      else if (!ack.ok) {
        this.on.status('error');
        this.on.error(ack.error);
      }
    });
  }

  private entered(code: string) {
    this.code = code;
    setActiveRoom(code);
    this.on.entered(code);
    this.on.status('ready');
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

  /** Sai da sala de vez (o assento fica livre). */
  leave() {
    this.socket?.emit(EVENTS.leaveRoom);
    setActiveRoom(null);
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }
}
