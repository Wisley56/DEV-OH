import { STARTER_DECKS } from '@devoh/engine';
import { beforeEach, describe, expect, it } from 'vitest';
import { DomainError } from '../../../common/domain-error.js';
import { SecurityLog } from '../../../common/security/security-log.js';
import { AppConfig } from '../../../config/app-config.js';
import type { Room } from '../domain/room.js';
import { InMemoryRoomRepository } from '../infrastructure/in-memory-room.repository.js';
import type { Clock, IdGenerator, RoomNotifier, Scheduler } from './ports.js';
import { RoomsService } from './rooms.service.js';

const deck = STARTER_DECKS[0].cards;

describe('RoomsService', () => {
  let now = 0;
  let codes: string[];
  let published: string[];
  let repo: InMemoryRoomRepository;
  let svc: RoomsService;
  /** Agendador falso: guarda as tarefas para o teste disparar. */
  let tasks: Map<string, { at: number; task: () => void }>;
  const fire = (prefix: string) => {
    const [key, t] = [...tasks].find(([k]) => k.startsWith(prefix))!;
    tasks.delete(key);
    now = t.at;
    t.task();
  };

  beforeEach(() => {
    now = 1000;
    codes = ['AAAAA', 'AAAAA', 'BBBBB'];
    published = [];
    let t = 0;
    const ids: IdGenerator = { roomCode: () => codes.shift()!, token: () => `tok${++t}` };
    const clock: Clock = { now: () => now };
    const notifier: RoomNotifier = { publish: (r: Room) => published.push(r.code) };
    repo = new InMemoryRoomRepository();
    tasks = new Map();
    const scheduler: Scheduler = { schedule: (key, at, task) => tasks.set(key, { at, task }), cancel: (key) => tasks.delete(key) };
    const config = new AppConfig({ MAX_ROOMS: '2', TURN_TIMEOUT_MS: '90000', RECONNECT_TIMEOUT_MS: '60000' });
    svc = new RoomsService(repo, ids, clock, notifier, config, new SecurityLog(), scheduler);
  });

  it('cria sala, entra e começa o duelo', () => {
    const host = svc.create('s1', '  Ana  ', deck);
    expect(host).toEqual({ code: 'AAAAA', token: 'tok1' });
    const guest = svc.join('s2', 'aaaaa', undefined, deck);
    const room = repo.get('AAAAA')!;
    expect(guest.token).toBe('tok2');
    expect(room.players.map((p) => p?.name)).toEqual(['Ana', 'Dev Anônimo']);
    expect(room.game).not.toBeNull();
    expect(published).toEqual(['AAAAA', 'AAAAA']);
  });

  it('não repete código de sala existente', () => {
    svc.create('s1', 'A', deck);
    expect(svc.create('s2', 'B', deck).code).toBe('BBBBB');
  });

  it('valida deck, sala cheia e sala inexistente', () => {
    expect(() => svc.create('s1', 'A', ['qa'])).toThrow(DomainError);
    expect(() => svc.join('s2', 'ZZZZZ', 'B', deck)).toThrow('Sala não encontrada');
    svc.create('s1', 'A', deck);
    svc.join('s2', 'AAAAA', 'B', deck);
    expect(() => svc.join('s3', 'AAAAA', 'C', deck)).toThrow('A sala já está cheia.');
  });

  it('recusa sala nova acima do teto do servidor', () => {
    codes = ['AAAAA', 'BBBBB', 'CCCCC'];
    svc.create('s1', 'A', deck);
    svc.create('s2', 'B', deck);
    expect(() => svc.create('s3', 'C', deck)).toThrow('Servidor lotado');
  });

  it('reconecta pelo token e recusa token errado', () => {
    const { code, token } = svc.create('s1', 'A', deck);
    svc.disconnect(code, 's1');
    expect(repo.get(code)!.players[0].socketId).toBeNull();
    expect(() => svc.rejoin('s9', code, 'errado')).toThrow('Sessão expirada.');
    svc.rejoin('s9', code, token);
    expect(svc.locate(code, 's9').seat).toBe(0);
  });

  it('sair antes do duelo apaga a sala', () => {
    const { code } = svc.create('s1', 'A', deck);
    svc.leave(code, 's1');
    expect(repo.has(code)).toBe(false);
  });

  it('revanche só quando os dois pedem, depois do fim', () => {
    const { code } = svc.create('s1', 'A', deck);
    svc.join('s2', code, 'B', deck);
    const room = repo.get(code)!;
    svc.rematch(code, 's1');
    expect(room.rematch).toEqual([false, false]);
    room.game!.winner = 0;
    const before = room.game;
    svc.rematch(code, 's1');
    expect(room.rematch).toEqual([true, false]);
    svc.rematch(code, 's2');
    expect(room.game).not.toBe(before);
    expect(room.rematch).toEqual([false, false]);
  });

  it('limpa salas paradas', () => {
    const { code } = svc.create('s1', 'A', deck);
    svc.disconnect(code, 's1');
    now += 5 * 60 * 1000;
    expect(svc.sweep(60 * 60 * 1000, 10 * 60 * 1000)).toBe(0);
    now += 6 * 60 * 1000;
    expect(svc.sweep(60 * 60 * 1000, 10 * 60 * 1000)).toBe(1);
    expect(svc.count()).toBe(0);
  });

  it('timer do turno: estourou, passa a vez; 3 estouros seguidos dão derrota', () => {
    const { code } = svc.create('s1', 'A', deck);
    svc.join('s2', code, 'B', deck);
    const room = repo.get(code)!;
    const first = room.game!.active;
    expect(room.turnDeadline).toBe(now + 90000);
    fire('turn:');
    expect(room.game!.active).not.toBe(first);
    expect(room.timeouts[first]).toBe(1);
    // Os dois deixam estourar: na 3ª vez seguida, quem estourou perde por tempo.
    for (let i = 0; i < 4; i++) fire('turn:');
    expect(room.game!.outcome).toEqual({ reason: 'timeout', loser: first });
    expect(room.turnDeadline).toBeNull();
  });

  it('jogar zera o contador de estouros', () => {
    const { code } = svc.create('s1', 'A', deck);
    svc.join('s2', code, 'B', deck);
    const room = repo.get(code)!;
    const first = room.game!.active;
    fire('turn:');
    fire('turn:');
    expect(room.timeouts[first]).toBe(1);
    room.noteAction(first);
    expect(room.timeouts[first]).toBe(0);
  });

  it('quem cai no meio do duelo perde por W.O. se não voltar; voltar cancela', () => {
    const { code, token } = svc.create('s1', 'A', deck);
    svc.join('s2', code, 'B', deck);
    const room = repo.get(code)!;
    svc.disconnect(code, 's1');
    expect(room.players[0].reconnectDeadline).toBe(now + 60000);
    svc.rejoin('s9', code, token);
    expect(room.players[0].reconnectDeadline).toBeNull();
    expect([...tasks.keys()].some((k) => k.startsWith('gone:'))).toBe(false);

    svc.disconnect(code, 's9');
    fire('gone:');
    expect(room.game!.outcome).toEqual({ reason: 'abandon', loser: 0 });
  });

  it('se os dois caem, ninguém ganha por W.O.', () => {
    const { code } = svc.create('s1', 'A', deck);
    svc.join('s2', code, 'B', deck);
    svc.disconnect(code, 's1');
    svc.disconnect(code, 's2');
    fire('gone:');
    expect(repo.get(code)!.game!.winner).toBeNull();
  });

  it('lista só salas públicas esperando oponente', () => {
    codes = ['AAAAA', 'BBBBB', 'CCCCC'];
    svc.create('s1', 'Ana', deck);
    svc.create('s2', 'Bia', deck, true);
    expect(svc.listOpen()).toEqual([{ code: 'AAAAA', host: 'Ana', waitingMs: 0 }]);
    svc.join('s3', 'AAAAA', 'Caio', deck);
    expect(svc.listOpen()).toEqual([]);
  });
});
