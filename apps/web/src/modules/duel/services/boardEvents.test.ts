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
    faceDown: false,
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
    expect(events.map((e) => e.kind)).toEqual(['attack', 'hit', 'destroy', 'damage', 'stress']);
    expect(events[0]).toMatchObject({ seat: 1, attacker: atk, target });
    expect(events[1]).toMatchObject({ seat: 0, target });
  });

  it('defesa maior: o alvo bloqueia e o dano volta para o atacante', () => {
    let s = game();
    const target = place(s, 0, 'stackoverflow', 'def');
    const atk = place(s, 1, 'backend_noturno', 'atk');
    s = toBattle(s);
    const { events } = step(s, 1, { type: 'attack', iid: atk, target });
    expect(events.map((e) => e.kind)).toEqual(['attack', 'block', 'damage', 'stress']);
    expect(events[1]).toMatchObject({ kind: 'block', seat: 0, target });
    expect(events[2]).toMatchObject({ kind: 'damage', seat: 1 });
  });

  it('ataque direto acerta o HUD', () => {
    let s = game();
    const atk = place(s, 1, 'backend_noturno', 'atk');
    s = toBattle(s);
    const { events } = step(s, 1, { type: 'attack', iid: atk });
    expect(events.map((e) => e.kind)).toEqual(['attack', 'hit', 'damage', 'stress']);
    expect(events[1]).toMatchObject({ seat: 0, target: undefined });
  });

  it('Profissional virado atacado: revela antes do golpe', () => {
    let s = game();
    const d = place(s, 0, 'stackoverflow', 'def');
    s.players[0].pros.find((p) => p?.card.iid === d)!.faceDown = true;
    const atk = place(s, 1, 'qa', 'atk');
    s = toBattle(s);
    const { events } = step(s, 1, { type: 'attack', iid: atk, target: d });
    expect(events.map((e) => e.kind)).toEqual(['attack', 'flip', 'block', 'damage', 'stress', 'effect', 'effect']);
    expect(events[1]).toMatchObject({ kind: 'flip', seat: 0, iid: d, cardId: 'stackoverflow' });
  });

  it('baixar Profissional virado toca o "set" e não revela o card', () => {
    const s = game();
    const iid = s.players[0].hand.find((c) => c.cardId === 'qa' || c.cardId === 'backend_noturno')!.iid;
    const { events } = step(s, 0, { type: 'set', iid });
    expect(events).toEqual([{ kind: 'set', seat: 0 }]);
  });

  it('Bug virado se revela quando dispara', () => {
    let s = game();
    const bug = { iid: 'bug1', cardId: 'erro_404', owner: 0 as Seat };
    s.players[0].spells[0] = { card: bug, faceDown: true, revealed: false, setTurn: -5 };
    const atk = place(s, 1, 'backend_noturno', 'atk');
    s = toBattle(s);
    const { events } = step(s, 1, { type: 'attack', iid: atk });
    expect(events[0]).toMatchObject({ kind: 'attack', seat: 1 });
    expect(events.find((e) => e.kind === 'reveal')).toMatchObject({ seat: 0, iid: 'bug1', cardId: 'erro_404' });
    // A destruição do atacante sai com o Bug como origem.
    expect(events.find((e) => e.kind === 'destroy')).toMatchObject({ iid: atk, source: { cardId: 'erro_404', iid: 'bug1' } });
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
    expect(r.events.at(-1)).toMatchObject({ kind: 'end', winner: 0 });
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
  it('Task com alvo: a ativação leva o alvo, e o ATK que mudou vira um evento só', () => {
    const s = game();
    const mine = place(s, 0, 'backend_noturno');
    place(s, 0, 'qa');
    s.players[0].hand.push({ iid: 'rgb1', cardId: 'teclado_rgb', owner: 0 });
    const { events } = step(s, 0, { type: 'activate', iid: 'rgb1', target: mine });
    expect(events.map((e) => e.kind)).toEqual(['activate', 'stat']);
    expect(events[0]).toMatchObject({ target: mine, caption: expect.stringContaining('Teclado') });
    expect(events[1]).toEqual({ kind: 'stat', items: [{ seat: 0, iid: mine, atk: 500, def: 0 }] });
  });

  it('Estresse por efeito tem legenda e origem; o ATK do Modo Desespero não vira evento de ATK', () => {
    const s = game();
    place(s, 0, 'backend_noturno');
    place(s, 1, 'backend_noturno');
    s.players[0].hand.push({ iid: 'daily1', cardId: 'daily', owner: 0 });
    const { events } = step(s, 0, { type: 'activate', iid: 'daily1' });
    const stress = events.filter((e) => e.kind === 'stress');
    expect(stress.map((e) => (e.kind === 'stress' ? [e.seat, e.amount, e.source?.cardId] : null))).toEqual([
      [0, 2, 'daily'],
      [1, 2, 'daily'],
    ]);
    expect(stress.every((e) => !!e.caption)).toBe(true);
    expect(events.some((e) => e.kind === 'stat')).toBe(false);
  });

  it('Estresse no limite e volta para a mão têm evento próprio', () => {
    const s = game();
    s.players[0].stress = 5;
    place(s, 0, 'backend_noturno');
    s.players[0].hand.push({ iid: 'daily2', cardId: 'daily', owner: 0 });
    const r = step(s, 0, { type: 'activate', iid: 'daily2' });
    expect(r.events.map((e) => e.kind)).toContain('meltdown');

    let s2 = game();
    place(s2, 0, 'qa');
    s2.players[0].spells[0] = { card: { iid: 'esc1', cardId: 'mudanca_escopo', owner: 0 }, faceDown: true, revealed: false, setTurn: -5 };
    const atk = place(s2, 1, 'backend_noturno');
    s2 = toBattle(s2);
    const { events } = step(s2, 1, { type: 'attack', iid: atk, target: s2.players[0].pros.find((p) => p)!.card.iid });
    expect(events.find((e) => e.kind === 'bounce')).toMatchObject({ seat: 1, iid: atk, source: { cardId: 'mudanca_escopo' } });
  });

  it('posição mudada por efeito vira evento; mudada pelo botão, não', () => {
    const s = game();
    const theirs = place(s, 1, 'backend_noturno');
    s.players[0].hand.push({ iid: 'reu1', cardId: 'reuniao', owner: 0 });
    const byEffect = step(s, 0, { type: 'activate', iid: 'reu1', target: theirs });
    expect(byEffect.events.find((e) => e.kind === 'position')).toEqual({ kind: 'position', items: [{ seat: 1, iid: theirs, to: 'def' }] });

    const s2 = game();
    const mine = place(s2, 0, 'backend_noturno');
    const byButton = step(s2, 0, { type: 'changePosition', iid: mine });
    expect(byButton.events.some((e) => e.kind === 'position')).toBe(false);
  });
});
