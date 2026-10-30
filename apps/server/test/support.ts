import { EVENTS, type Ack, type RoomState } from '@devoh/protocol';
import type { INestApplication } from '@nestjs/common';
import { io, type Socket } from 'socket.io-client';
import { bootstrap } from '../src/bootstrap.js';

/** Servidor de verdade (porta livre, banco PGlite em memória) com as variáveis dadas. */
export async function startServer(env: Record<string, string> = {}) {
  const saved = { ...process.env };
  Object.assign(process.env, env);
  const app: INestApplication = await bootstrap(0, false);
  const addr = app.getHttpServer().address() as { port: number };
  const sockets: Socket[] = [];
  return {
    url: `http://127.0.0.1:${addr.port}`,
    sockets,
    async close() {
      sockets.forEach((s) => s.disconnect());
      await app.close();
      process.env = saved;
    },
  };
}

export type TestServer = Awaited<ReturnType<typeof startServer>>;

/** POST JSON na API, com a origem do site e o cookie de sessão, se houver. */
export function post(url: string, path: string, body: unknown, opts: { cookie?: string; origin?: string } = {}) {
  return fetch(`${url}/api${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(opts.cookie && { cookie: opts.cookie }),
      ...(opts.origin && { origin: opts.origin }),
    },
    body: JSON.stringify(body),
  });
}

/** Cookie `nome=valor` do Set-Cookie da resposta. */
export const sessionCookie = (res: Response) => res.headers.get('set-cookie')?.split(';')[0] ?? '';

/** Cria a conta (o Turnstile de teste aceita qualquer token) e devolve o cookie de sessão. */
export async function signUp(url: string, username: string, origin?: string) {
  const res = await post(
    url,
    '/auth/register',
    { username, displayName: username, password: 'senha-forte-1', turnstileToken: 'ok' },
    { origin },
  );
  if (res.status !== 201) throw new Error(`cadastro de ${username} falhou: ${res.status} ${await res.text()}`);
  return sessionCookie(res);
}

/** Socket.IO de um jogador logado (o cookie vai no handshake, como no navegador). */
export function openSocket(server: TestServer, cookie: string | undefined, origin?: string) {
  const headers: Record<string, string> = {};
  if (cookie) headers.cookie = cookie;
  if (origin) headers.origin = origin;
  const s = io(server.url, { transports: ['websocket'], forceNew: true, reconnection: false, extraHeaders: headers });
  server.sockets.push(s);
  return s;
}

/** true se conectou; false se o servidor recusou. */
export const connected = (s: Socket) =>
  new Promise<boolean>((r) => {
    s.once('connect', () => r(true));
    s.once('connect_error', () => r(false));
  });

export async function player(server: TestServer, cookie: string, origin?: string) {
  const s = openSocket(server, cookie, origin);
  if (!(await connected(s))) throw new Error('socket recusado');
  return s;
}

export const call = (s: Socket, ev: string, payload?: unknown) => new Promise<Ack>((r) => s.emit(ev, payload, r));

export const nextState = (s: Socket, pred: (r: RoomState) => boolean = () => true) =>
  new Promise<RoomState>((resolve) => {
    const on = (r: RoomState) => {
      if (!pred(r)) return;
      s.off(EVENTS.roomState, on);
      resolve(r);
    };
    s.on(EVENTS.roomState, on);
  });
