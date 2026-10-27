import { applyAction, createGame, getView, validateDeck, type Action, type GameState, type Seat } from '@devoh/game';
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import { Server, type Socket } from 'socket.io';

const PORT = Number(process.env.PORT ?? 3001);
/** Lista separada por vírgula; "*" libera tudo (padrão em dev). */
const CORS_ORIGIN = (process.env.CORS_ORIGIN ?? '*').split(',').map((s) => s.trim());
const ROOM_TTL_MS = 2 * 60 * 60 * 1000;

interface Seatholder {
  name: string;
  deck: string[];
  token: string;
  socketId: string | null;
}

interface Room {
  code: string;
  players: (Seatholder | null)[];
  game: GameState | null;
  rematch: [boolean, boolean];
  touched: number;
}

const rooms = new Map<string, Room>();

type Ack = (res: { ok: true; code?: string; token?: string } | { ok: false; error: string }) => void;

const http = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, rooms: rooms.size }));
    return;
  }
  res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
  res.end('DEV-OH! servidor de duelos no ar.');
});

const io = new Server(http, {
  cors: { origin: CORS_ORIGIN.includes('*') ? true : CORS_ORIGIN },
});

function newCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (;;) {
    const code = Array.from(randomBytes(5), (b) => alphabet[b % alphabet.length]).join('');
    if (!rooms.has(code)) return code;
  }
}
const newToken = () => randomBytes(18).toString('base64url');

function cleanName(n: unknown) {
  return (typeof n === 'string' ? n.trim().slice(0, 20) : '') || 'Dev Anônimo';
}

function checkDeck(deck: unknown): string | null {
  if (!Array.isArray(deck) || !deck.every((x) => typeof x === 'string')) return 'Deck inválido.';
  return validateDeck(deck)[0] ?? null;
}

/** Envia para cada jogador o estado que ele pode ver. */
function broadcast(room: Room) {
  room.touched = Date.now();
  room.players.forEach((p, i) => {
    if (!p?.socketId) return;
    io.to(p.socketId).emit('room:state', {
      code: room.code,
      seat: i,
      status: room.game ? 'playing' : 'waiting',
      players: room.players.map((x) => (x ? { name: x.name, connected: !!x.socketId } : null)),
      rematch: room.rematch,
      view: room.game ? getView(room.game, i as Seat) : null,
    });
  });
}

function startGame(room: Room) {
  const [a, b] = room.players as Seatholder[];
  room.game = createGame({ players: [{ name: a.name, deck: a.deck }, { name: b.name, deck: b.deck }] });
  room.rematch = [false, false];
}

function seatOf(room: Room, socket: Socket): Seat | null {
  const i = room.players.findIndex((p) => p?.socketId === socket.id);
  return i < 0 ? null : (i as Seat);
}

io.on('connection', (socket) => {
  let current: Room | null = null;

  socket.on('room:create', (msg: { name?: string; deck?: string[] }, ack: Ack) => {
    const err = checkDeck(msg?.deck);
    if (err) return ack({ ok: false, error: err });
    const room: Room = {
      code: newCode(),
      players: [{ name: cleanName(msg.name), deck: msg.deck!, token: newToken(), socketId: socket.id }, null],
      game: null,
      rematch: [false, false],
      touched: Date.now(),
    };
    rooms.set(room.code, room);
    current = room;
    ack({ ok: true, code: room.code, token: room.players[0]!.token });
    broadcast(room);
  });

  socket.on('room:join', (msg: { code?: string; name?: string; deck?: string[] }, ack: Ack) => {
    const room = rooms.get(String(msg?.code ?? '').toUpperCase());
    if (!room) return ack({ ok: false, error: 'Sala não encontrada. Confere o código?' });
    if (room.players[1]) return ack({ ok: false, error: 'A sala já está cheia.' });
    const err = checkDeck(msg.deck);
    if (err) return ack({ ok: false, error: err });
    room.players[1] = { name: cleanName(msg.name), deck: msg.deck!, token: newToken(), socketId: socket.id };
    current = room;
    startGame(room);
    ack({ ok: true, code: room.code, token: room.players[1].token });
    broadcast(room);
  });

  socket.on('room:rejoin', (msg: { code?: string; token?: string }, ack: Ack) => {
    const room = rooms.get(String(msg?.code ?? '').toUpperCase());
    const p = room?.players.find((x) => x && x.token === msg?.token);
    if (!room || !p) return ack({ ok: false, error: 'Sessão expirada.' });
    p.socketId = socket.id;
    current = room;
    ack({ ok: true, code: room.code, token: p.token });
    broadcast(room);
  });

  socket.on('action', (action: Action, ack: Ack) => {
    const room = current;
    if (!room?.game) return ack?.({ ok: false, error: 'Nenhum duelo em andamento.' });
    const seat = seatOf(room, socket);
    if (seat === null) return ack?.({ ok: false, error: 'Você não está nesta sala.' });
    if (!action || typeof action !== 'object' || typeof (action as { type?: unknown }).type !== 'string')
      return ack?.({ ok: false, error: 'Ação inválida.' });
    try {
      const r = applyAction(room.game, seat, action);
      if (!r.ok) return ack?.({ ok: false, error: r.error });
      room.game = r.state;
      ack?.({ ok: true });
      broadcast(room);
    } catch (e) {
      console.error('Erro aplicando ação', room.code, action, e);
      ack?.({ ok: false, error: 'Erro interno no servidor.' });
    }
  });

  socket.on('room:rematch', () => {
    const room = current;
    if (!room?.game || room.game.winner === null) return;
    const seat = seatOf(room, socket);
    if (seat === null) return;
    room.rematch[seat] = true;
    if (room.rematch[0] && room.rematch[1]) startGame(room);
    broadcast(room);
  });

  socket.on('room:leave', () => {
    const room = current;
    if (!room) return;
    const seat = seatOf(room, socket);
    if (seat !== null) room.players[seat]!.socketId = null;
    if (!room.game) rooms.delete(room.code);
    else broadcast(room);
    current = null;
  });

  socket.on('disconnect', () => {
    const room = current;
    if (!room) return;
    const seat = seatOf(room, socket);
    if (seat !== null) room.players[seat]!.socketId = null;
    broadcast(room);
  });
});

// Limpa salas paradas.
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    const empty = room.players.every((p) => !p?.socketId);
    if (now - room.touched > ROOM_TTL_MS || (empty && now - room.touched > 10 * 60 * 1000)) rooms.delete(code);
  }
}, 60 * 1000).unref();

http.listen(PORT, () => console.log(`DEV-OH! server ouvindo na porta ${PORT}`));
