import type { Action, GameView } from '@devoh/game';
import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { getSession, setSession } from './storage';

export const SERVER_URL = import.meta.env.VITE_SERVER_URL || `${location.protocol}//${location.hostname}:3001`;

export interface RoomState {
  code: string;
  seat: 0 | 1;
  status: 'waiting' | 'playing';
  players: { name: string; connected: boolean }[];
  rematch: boolean[];
  view: GameView | null;
}

type Ack = { ok: true; code?: string; token?: string } | { ok: false; error: string };

export type OnlineIntent = { kind: 'create'; name: string; deck: string[] } | { kind: 'join'; code: string; name: string; deck: string[] };

export function useOnlineRoom(intent: OnlineIntent) {
  const sock = useRef<Socket | null>(null);
  const [room, setRoom] = useState<RoomState | null>(null);
  const [status, setStatus] = useState<'connecting' | 'ready' | 'offline' | 'error'>('connecting');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const s = io(SERVER_URL, { transports: ['websocket', 'polling'] });
    sock.current = s;
    let joined = false;

    const enter = () => {
      const saved = getSession();
      const code = intent.kind === 'join' ? intent.code.toUpperCase() : undefined;
      // Reconexão: mesma sala salva → usa o token.
      if (saved && (joined || (code && saved.code === code))) {
        s.emit('room:rejoin', saved, (ack: Ack) => {
          if (ack.ok) {
            joined = true;
            setStatus('ready');
          } else if (!joined) {
            setSession(null);
            enterFresh();
          } else {
            setStatus('error');
            setError(ack.error);
          }
        });
        return;
      }
      enterFresh();
    };
    const enterFresh = () => {
      const ev = intent.kind === 'create' ? 'room:create' : 'room:join';
      const payload = intent.kind === 'create' ? { name: intent.name, deck: intent.deck } : { code: intent.code.toUpperCase(), name: intent.name, deck: intent.deck };
      s.emit(ev, payload, (ack: Ack) => {
        if (ack.ok && ack.code && ack.token) {
          joined = true;
          setSession({ code: ack.code, token: ack.token });
          setStatus('ready');
        } else if (!ack.ok) {
          setStatus('error');
          setError(ack.error);
        }
      });
    };

    s.on('connect', enter);
    s.on('disconnect', () => setStatus('offline'));
    s.on('connect_error', () => {
      setStatus('offline');
      setError(`Não consegui falar com o servidor (${SERVER_URL}).`);
    });
    s.on('room:state', (r: RoomState) => setRoom(r));
    return () => {
      s.disconnect();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const send = useCallback(
    (action: Action) =>
      new Promise<string | null>((resolve) => {
        if (!sock.current?.connected) return resolve('Sem conexão com o servidor.');
        sock.current.emit('action', action, (ack: Ack) => resolve(ack.ok ? null : ack.error));
      }),
    [],
  );
  const rematch = useCallback(() => sock.current?.emit('room:rematch'), []);
  const leave = useCallback(() => {
    sock.current?.emit('room:leave');
    setSession(null);
  }, []);

  return { room, status, error, send, rematch, leave };
}
