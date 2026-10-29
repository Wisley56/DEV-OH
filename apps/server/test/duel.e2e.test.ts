import { STARTER_DECKS } from '@devoh/engine';
import { EVENTS, type Ack, type RoomState } from '@devoh/protocol';
import type { INestApplication } from '@nestjs/common';
import { io, type Socket } from 'socket.io-client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { bootstrap } from '../src/bootstrap.js';

/** Sobe o servidor de verdade e joga com dois clientes Socket.IO. */
describe('servidor de duelos (e2e)', () => {
  let app: INestApplication;
  let url: string;
  const sockets: Socket[] = [];

  beforeAll(async () => {
    app = await bootstrap(0, false);
    const addr = app.getHttpServer().address() as { port: number };
    url = `http://127.0.0.1:${addr.port}`;
  });
  afterAll(async () => {
    sockets.forEach((s) => s.disconnect());
    await app.close();
  });

  const client = async () => {
    const s = io(url, { transports: ['websocket'], forceNew: true });
    sockets.push(s);
    await new Promise<void>((r) => s.on('connect', () => r()));
    return s;
  };
  const call = (s: Socket, ev: string, payload?: unknown) => new Promise<Ack>((r) => s.emit(ev, payload, r));
  const nextState = (s: Socket, pred: (r: RoomState) => boolean = () => true) =>
    new Promise<RoomState>((resolve) => {
      const on = (r: RoomState) => {
        if (!pred(r)) return;
        s.off(EVENTS.roomState, on);
        resolve(r);
      };
      s.on(EVENTS.roomState, on);
    });

  it('responde o healthcheck', async () => {
    const res = await fetch(`${url}/health`);
    expect(await res.json()).toEqual({ ok: true, rooms: 0 });
  });

  it('rejeita payload inválido no ack', async () => {
    const a = await client();
    expect(await call(a, EVENTS.createRoom, { deck: 'nada' })).toEqual({ ok: false, error: 'Deck inválido.' });
    expect(await call(a, EVENTS.action, { type: 'hack' })).toEqual({ ok: false, error: 'Ação inválida.' });
    expect(await call(a, EVENTS.action, { type: 'endTurn' })).toEqual({ ok: false, error: 'Nenhum duelo em andamento.' });
  });

  it('cria, entra, joga, esconde a mão e reconecta', async () => {
    const a = await client();
    const b = await client();
    const created = await call(a, EVENTS.createRoom, { name: 'Ana', deck: STARTER_DECKS[0].cards });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const code = created.code!;

    const aPlaying = nextState(a, (r) => r.status === 'playing');
    const bPlaying = nextState(b, (r) => r.status === 'playing');
    const joined = await call(b, EVENTS.joinRoom, { code: code.toLowerCase(), name: 'Bia', deck: STARTER_DECKS[1].cards });
    expect(joined.ok).toBe(true);
    const [ra, rb] = await Promise.all([aPlaying, bPlaying]);
    expect(ra.seat).toBe(0);
    expect(rb.seat).toBe(1);
    expect(ra.view!.players[0].hand).not.toBeNull();
    expect(ra.view!.players[1].hand).toBeNull();
    expect(ra.players.map((p) => p?.name)).toEqual(['Ana', 'Bia']);

    const active = ra.view!.active === 0 ? a : b;
    const idle = active === a ? b : a;
    expect(await call(idle, EVENTS.action, { type: 'endTurn' })).toEqual({ ok: false, error: 'Não é o seu turno.' });
    const turnPassed = nextState(idle, (r) => r.view!.turn === 2);
    expect(await call(active, EVENTS.action, { type: 'endTurn' })).toEqual({ ok: true });
    await turnPassed;

    // Queda e volta pelo token.
    const dropped = nextState(b, (r) => r.players[0]?.connected === false);
    a.disconnect();
    await dropped;
    const a2 = await client();
    const back = nextState(a2);
    expect(await call(a2, EVENTS.rejoinRoom, { code, token: created.token })).toMatchObject({ ok: true, code });
    expect((await back).view!.turn).toBe(2);
  });
});
