import { applyAction, createGame, getView, type Action, type GameState, type Seat } from '@devoh/engine';
import { describe, expect, it } from 'vitest';
import { boardEvents } from './boardEvents';

const filler = Array.from({ length: 20 }, (_, i) => (i % 2 ? 'backend_noturno' : 'qa'));

const game = () =>
  createGame({
    players: [
      { name: 'Ana', deck: filler },
      { name: 'Bia', deck: filler },
    ],
    seed: 42,
    first: 0,
  });

let nextIid = 9000;
function place(s: GameState, seat: Seat, cardId: string, position: 'atk' | 'def' = 'atk') {
  const card = { iid: `t${nextIid++}`, cardId, owner: seat };
  const z = s.players[seat].pros.findIndex((x) => !x);
  s.players[seat].pros[z] = {
    card,
    position,
    atkMod: 0,
    defMod: 0,
    tempAtk: 0,
    summonedTurn: -5,
    attackedTurn: -5,
    changedPosTurn: -5,
    ignitionTurn: -5,
    lockedUntilTurn: -5,
    oncePerTurn: {},
  };
  return card.iid;
}

/** Aplica a jogada e devolve os eventos que ela gerou (visão do assento 0). */
function step(s: GameState, seat: Seat, a: Action) {
  const r = applyAction(s, seat, a);
  if (!r.ok) throw new Error(r.error);
  const events = boardEvents(getView(s, 0), getView(r.state, 0), s.log.at(-1)!.id);
  return { s: r.state, events };
}

function toBattle(s: GameState) {
  s = step(s, 0, { type: 'endTurn' }).s;
  return step(s, 1, { type: 'goBattle' }).s;
}

describe('eventos do tabuleiro', () => {
  it('ataque que destrói: espadas, golpe no alvo, destruição e dano', () => {
    let s = game();
    const target = place(s, 0, 'estagiario', 'atk');
    const atk = place(s, 1, 'backend_noturno', 'atk');
    s = toBattle(s);
    const { events } = step(s, 1, { type: 'attack', iid: atk, target });
    expect(events.map((e) => e.kind)).toEqual(['attack', 'hit', 'destroy', 'damage']);
    expect(events[0]).toMatchObject({ seat: 1, attacker: atk, target });
    expect(events[1]).toMatchObject({ seat: 0, target });
  });

  it('defesa maior: o alvo bloqueia e o dano volta para o atacante', () => {
    let s = game();
    const target = place(s, 0, 'stackoverflow', 'def');
    const atk = place(s, 1, 'backend_noturno', 'atk');
    s = toBattle(s);
    const { events } = step(s, 1, { type: 'attack', iid: atk, target });
    expect(events.map((e) => e.kind)).toEqual(['attack', 'block', 'damage']);
    expect(events[1]).toMatchObject({ kind: 'block', seat: 0, target });
    expect(events[2]).toMatchObject({ kind: 'damage', seat: 1 });
  });

  it('ataque direto acerta o HUD', () => {
    let s = game();
    const atk = place(s, 1, 'backend_noturno', 'atk');
    s = toBattle(s);
    const { events } = step(s, 1, { type: 'attack', iid: atk });
    expect(events.map((e) => e.kind)).toEqual(['attack', 'hit', 'damage']);
    expect(events[1]).toMatchObject({ seat: 0, target: undefined });
  });

  it('Bug virado se revela quando dispara', () => {
    let s = game();
    const bug = { iid: 'bug1', cardId: 'erro_404', owner: 0 as Seat };
    s.players[0].spells[0] = { card: bug, faceDown: true, revealed: false, setTurn: -5 };
    const atk = place(s, 1, 'backend_noturno', 'atk');
    s = toBattle(s);
    const { events } = step(s, 1, { type: 'attack', iid: atk });
    expect(events[0]).toMatchObject({ kind: 'attack', seat: 1 });
    expect(events).toContainEqual({ kind: 'reveal', seat: 0, iid: 'bug1', cardId: 'erro_404' });
  });

  it('baixar um Bug, passar o turno e desistir', () => {
    const s = game();
    const bug = { iid: 'bug2', cardId: 'erro_404', owner: 0 as Seat };
    s.players[0].hand.push(bug);
    let r = step(s, 0, { type: 'set', iid: 'bug2' });
    expect(r.events).toEqual([{ kind: 'set', seat: 0 }]);
    r = step(r.s, 0, { type: 'endTurn' });
    expect(r.events).toContainEqual({ kind: 'turn', seat: 1 });
    r = step(r.s, 1, { type: 'surrender' });
    expect(r.events.at(-1)).toEqual({ kind: 'end', winner: 0 });
  });

  it('A Mão do Moisés rola o dado antes de destruir', () => {
    const s = game();
    place(s, 0, 'moises');
    s.players[1].spells[0] = { card: { iid: 'bug3', cardId: 'erro_404', owner: 1 }, faceDown: true, revealed: false, setTurn: -5 };
    s.players[0].hand.push({ iid: 'mao1', cardId: 'mao_moises', owner: 0 });
    const { events } = step(s, 0, { type: 'activate', iid: 'mao1' });
    const dice = events.find((e) => e.kind === 'dice');
    expect(dice).toMatchObject({ seat: 0, bonus: 1 });
    if (dice?.kind !== 'dice') throw new Error('sem dado');
    expect(dice.face).toBeGreaterThanOrEqual(1);
    expect(dice.face).toBeLessThanOrEqual(6);
    expect(dice.ok).toBe(dice.face + 1 >= 4);
    const kinds = events.map((e) => e.kind);
    if (dice.ok) expect(kinds.indexOf('destroy')).toBeGreaterThan(kinds.indexOf('dice'));
  });
});
