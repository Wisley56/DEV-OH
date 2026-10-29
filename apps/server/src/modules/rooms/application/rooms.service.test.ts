import { STARTER_DECKS } from '@devoh/engine';
import { beforeEach, describe, expect, it } from 'vitest';
import { DomainError } from '../../../common/domain-error.js';
import type { Room } from '../domain/room.js';
import { InMemoryRoomRepository } from '../infrastructure/in-memory-room.repository.js';
import type { Clock, IdGenerator, RoomNotifier } from './ports.js';
import { RoomsService } from './rooms.service.js';

const deck = STARTER_DECKS[0].cards;

describe('RoomsService', () => {
  let now = 0;
  let codes: string[];
  let published: string[];
  let repo: InMemoryRoomRepository;
  let svc: RoomsService;

  beforeEach(() => {
    now = 1000;
    codes = ['AAAAA', 'AAAAA', 'BBBBB'];
    published = [];
    let t = 0;
    const ids: IdGenerator = { roomCode: () => codes.shift()!, token: () => `tok${++t}` };
    const clock: Clock = { now: () => now };
    const notifier: RoomNotifier = { publish: (r: Room) => published.push(r.code) };
    repo = new InMemoryRoomRepository();
    svc = new RoomsService(repo, ids, clock, notifier);
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
});
