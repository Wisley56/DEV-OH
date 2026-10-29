import { STARTER_DECKS } from '@devoh/engine';
import { EVENTS, type Ack, type OpenRoom, type RoomState } from '@devoh/protocol';
import type { INestApplication } from '@nestjs/common';
import { io, type Socket } from 'socket.io-client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { bootstrap } from '../src/bootstrap.js';

/** Lista de salas, timer de turno e W.O. com prazos curtos (servidor de verdade). */
describe('salas abertas, timer e W.O. (e2e)', () => {
  let app: INestApplication;
  let url: string;
  const sockets: Socket[] = [];
  const saved = { ...process.env };
  const deck = STARTER_DECKS[0].cards;

  beforeAll(async () => {
    Object.assign(process.env, { TURN_TIMEOUT_MS: '400', RECONNECT_TIMEOUT_MS: '400' });
    app = await bootstrap(0, false);
    const addr = app.getHttpServer().address() as { port: number };
    url = `http://127.0.0.1:${addr.port}`;
  });
  afterAll(async () => {
    sockets.forEach((s) => s.disconnect());
    await app.close();
    process.env = saved;
  });

  const client = async () => {
    const s = io(url, { transports: ['websocket'], forceNew: true, reconnection: false });
    sockets.push(s);
    await new Promise<void>((r) => s.on('connect', () => r()));
    return s;
  };
  const call = (s: Socket, ev: string, payload?: unknown) => new Promise<Ack>((r) => s.emit(ev, payload, r));
  const nextState = (s: Socket, pred: (r: RoomState) => boolean) =>
    new Promise<RoomState>((resolve) => {
      const on = (r: RoomState) => {
        if (!pred(r)) return;
        s.off(EVENTS.roomState, on);
        resolve(r);
      };
      s.on(EVENTS.roomState, on);
    });
  const openRooms = async () => (await fetch(`${url}/rooms`).then((r) => r.json())) as OpenRoom[];

  it('lista só as salas públicas que esperam oponente', async () => {
    const a = await client();
    const b = await client();
    const pub = await call(a, EVENTS.createRoom, { name: 'Ana', deck });
    await call(b, EVENTS.createRoom, { name: 'Bia', deck, private: true });
    const list = await openRooms();
    expect(list.map((r) => r.host)).toEqual(['Ana']);
    expect(list[0].code).toBe(pub.ok ? pub.code : '');
    a.disconnect();
    b.disconnect();
  });

  it('turno estourado passa a vez sozinho, e quem cai perde por W.O.', async () => {
    const a = await client();
    const b = await client();
    const created = await call(a, EVENTS.createRoom, { name: 'Ana', deck });
    const code = created.ok ? created.code! : '';
    const started = nextState(a, (r) => r.status === 'playing');
    await call(b, EVENTS.joinRoom, { code, name: 'Bia', deck });
    const first = await started;
    expect(first.turnDeadline).toBeGreaterThan(first.serverNow);

    // Ninguém joga: o servidor encerra o turno quando o prazo acaba.
    const passed = await nextState(a, (r) => !!r.view && r.view.turn > first.view!.turn);
    expect(passed.view!.active).not.toBe(first.view!.active);

    // A Bia cai: a Ana vê a contagem e, sem volta, vence por W.O.
    const gone = nextState(a, (r) => r.players[1]?.connected === false);
    b.disconnect();
    expect((await gone).players[1]?.reconnectDeadline).toBeGreaterThan(0);
    const end = await nextState(a, (r) => r.view?.winner !== null && r.view?.winner !== undefined);
    expect(end.view!.outcome).toEqual({ reason: 'abandon', loser: 1 });
  });
});
