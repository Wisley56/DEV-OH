import { describe, expect, it } from 'vitest';
import { applyAction, createGame, getView } from '../index';
import { newInstance, newProSlot } from '../core/board';
import { card } from '../core/catalog';
import type { Action, GameState, LogEntry, Seat } from '../core/types';

/** O log diz qual card causou cada consequência, e a visão diz de onde vem o ATK/DEF. */

const deck = Array.from({ length: 20 }, (_, i) => (i % 2 ? 'dev_junior' : 'backend_noturno'));

/** Turno 2, vez do assento 0 (já pode batalhar). */
function setup(): GameState {
  const s = createGame({
    players: [
      { name: 'Ana', deck },
      { name: 'Bia', deck },
    ],
    seed: 7,
    first: 1,
  });
  return act(s, 1, { type: 'endTurn' });
}
function act(s: GameState, seat: Seat, a: Action): GameState {
  const r = applyAction(s, seat, a);
  if (!r.ok) throw new Error(r.error);
  return r.state;
}
function place(s: GameState, seat: Seat, cardId: string, position: 'atk' | 'def' = 'atk') {
  const c = newInstance(s, cardId, seat);
  s.players[seat].pros[s.players[seat].pros.findIndex((x) => !x)] = newProSlot(c, position, -5);
  return c.iid;
}
function hand(s: GameState, seat: Seat, cardId: string) {
  const c = newInstance(s, cardId, seat);
  s.players[seat].hand.push(c);
  return c.iid;
}
function setCard(s: GameState, seat: Seat, cardId: string, setTurn = -5) {
  const c = newInstance(s, cardId, seat);
  s.players[seat].spells[s.players[seat].spells.findIndex((x) => !x)] = { card: c, faceDown: true, revealed: false, setTurn };
  return c.iid;
}
/** Linhas que a jogada acrescentou. */
const added = (before: GameState, after: GameState): LogEntry[] => after.log.filter((l) => l.id >= before.nextLogId);

describe('origem das linhas do log', () => {
  it('as consequências de uma Task saem com a Task como origem', () => {
    const s = setup();
    const t = hand(s, 0, 'home_office');
    s.players[0].stress = 3;
    const lines = added(s, act(s, 0, { type: 'activate', iid: t }));
    expect(lines.find((l) => l.kind === 'task')?.source).toBeUndefined();
    for (const kind of ['stress', 'heal'] as const) {
      expect(lines.find((l) => l.kind === kind)?.source, kind).toEqual({ cardId: 'home_office', iid: t });
    }
  });

  it('o dano e o Estresse de um Bug saem com o Bug como origem; o dano de batalha, sem origem', () => {
    const s = setup();
    const attacker = place(s, 0, 'backend_noturno');
    const target = place(s, 1, 'dev_junior');
    const bug = setCard(s, 1, 'prod_caiu');
    const lines = added(s, act(act(s, 0, { type: 'goBattle' }), 0, { type: 'attack', iid: attacker, target }));
    const damage = lines.filter((l) => l.kind === 'damage');
    expect(damage.map((l) => [l.seat, l.amount, l.source?.cardId])).toEqual([
      [0, 800, 'prod_caiu'],
      [1, 300, undefined],
    ]);
    expect(lines.find((l) => l.kind === 'stress' && l.seat === 0)?.source).toEqual({ cardId: 'prod_caiu', iid: bug });
  });

  it('o Estresse devolvido pelo Douglas sai com o Douglas como origem', () => {
    const s = setup();
    const douglas = place(s, 1, 'douglas_problemas');
    const lines = added(s, act(s, 0, { type: 'activate', iid: hand(s, 0, 'reuniao') }));
    expect(lines.find((l) => l.fx === 'reflect')).toMatchObject({ seat: 1, source: { cardId: 'douglas_problemas', iid: douglas } });
    expect(lines.find((l) => l.kind === 'stress')).toMatchObject({ seat: 0, amount: 2, source: { cardId: 'douglas_problemas' } });
  });

  it('a Task registra o alvo, e voltar para a mão registra qual card voltou', () => {
    const s = setup();
    const mine = place(s, 0, 'dev_junior');
    const lines = added(s, act(s, 0, { type: 'activate', iid: hand(s, 0, 'teclado_rgb'), target: mine }));
    expect(lines.find((l) => l.kind === 'task')?.target).toBe(mine);

    const s2 = setup();
    const attacker = place(s2, 0, 'backend_noturno');
    const target = place(s2, 1, 'dev_junior');
    setCard(s2, 1, 'mudanca_escopo');
    const back = added(s2, act(act(s2, 0, { type: 'goBattle' }), 0, { type: 'attack', iid: attacker, target }));
    expect(back.find((l) => l.fx === 'bounce')).toMatchObject({ iid: attacker, seat: 0, source: { cardId: 'mudanca_escopo' } });
  });

  it('o limite de Estresse é marcado, com a origem de quem causou', () => {
    const s = setup();
    s.players[0].stress = 5;
    place(s, 0, 'dev_junior');
    const t = hand(s, 0, 'daily');
    const lines = added(s, act(s, 0, { type: 'activate', iid: t }));
    expect(lines.find((l) => l.fx === 'meltdown')).toMatchObject({ seat: 0, source: { cardId: 'daily', iid: t } });
  });

  it('cada jogada tem um número, e as linhas dela levam esse número', () => {
    const s = setup();
    const a = act(s, 0, { type: 'activate', iid: hand(s, 0, 'home_office') });
    const b = act(a, 0, { type: 'endTurn' });
    const actsA = new Set(added(s, a).map((l) => l.act));
    const actsB = new Set(added(a, b).map((l) => l.act));
    expect(actsA.size).toBe(1);
    expect(actsB.size).toBe(1);
    expect([...actsB][0]).toBe([...actsA][0]! + 1);
  });
});

describe('de onde vem o ATK/DEF', () => {
  it('a lista de partes soma o valor mostrado', () => {
    const s = setup();
    s.players[0].stress = 2;
    const mine = place(s, 0, 'dev_junior');
    place(s, 1, 'pirulito');
    let r = act(s, 0, { type: 'activate', iid: hand(s, 0, 'teclado_rgb'), target: mine });
    r = act(r, 0, { type: 'activate', iid: hand(r, 0, 'gato_gordo') });
    const pro = getView(r, 0).players[0].pros.find((x) => x)!;
    expect(pro.mods).toEqual([
      { rule: 'stress', atk: 200 },
      { cardId: 'gato_gordo', atk: 300 },
      { cardId: 'pirulito', atk: -300 },
      { cardId: 'teclado_rgb', atk: 500 },
    ]);
    const sum = (card('dev_junior').atk ?? 0) + pro.mods!.reduce((n, p) => n + (p.atk ?? 0), 0);
    expect(pro.atk).toBe(sum);
  });

  it('sem modificador não há lista, e o card virado do oponente não mostra nada', () => {
    const s = setup();
    place(s, 0, 'dev_junior');
    const c = newInstance(s, 'dev_junior', 1);
    s.players[1].pros[0] = newProSlot(c, 'def', -5, true);
    s.players[1].stress = 3;
    const v = getView(s, 0);
    expect(v.players[0].pros.find((x) => x)!.mods).toBeUndefined();
    expect(v.players[1].pros.find((x) => x)!.mods).toBeUndefined();
  });
});

describe('Bug baixado neste turno', () => {
  it('só o dono vê o aviso, e só no turno em que baixou', () => {
    const s = setup();
    const bug = hand(s, 0, 'erro_404');
    let r = act(s, 0, { type: 'set', iid: bug });
    const mine = (g: GameState, viewer: Seat) => getView(g, viewer).players[0].spells.find((x) => x)!;
    expect(mine(r, 0).setThisTurn).toBe(true);
    expect(mine(r, 1).setThisTurn).toBeUndefined();
    r = act(r, 0, { type: 'endTurn' });
    expect(mine(r, 0).setThisTurn).toBeUndefined();
  });
});
