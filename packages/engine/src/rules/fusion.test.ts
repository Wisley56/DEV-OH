import { describe, expect, it } from 'vitest';
import { applyAction, BASE_CARD_LIST, card, cardInfo, createGame, FUSIONS, getView, MOCORONGO_PIECES, validateDeck } from '../index';
import { newInstance, newProSlot } from '../core/board';
import type { GameState, Seat } from '../core/types';
import { destroyPro } from './zones';

const FUSION = 'mocorongo_fusao';
const filler = Array.from({ length: 20 }, (_, i) => (i % 2 ? 'backend_noturno' : 'qa'));

function game() {
  return createGame({
    players: [
      { name: 'Ana', deck: filler },
      { name: 'Bia', deck: filler },
    ],
    seed: 7,
    first: 0,
  });
}

function give(s: GameState, seat: Seat, ids: readonly string[]) {
  for (const id of ids) s.players[seat].hand.push(newInstance(s, id, seat));
}

describe('Devs Mocorongos (fusão)', () => {
  it('a fusão é interna: fora da coleção e dos decks; as peças são da coleção', () => {
    expect(BASE_CARD_LIST.some((c) => c.id === FUSION)).toBe(false);
    expect(FUSIONS.map((f) => f.id)).toContain(FUSION);
    expect(card(FUSION).fusionOf).toEqual([...MOCORONGO_PIECES]);
    for (const id of MOCORONGO_PIECES)
      expect(
        BASE_CARD_LIST.some((c) => c.id === id),
        id,
      ).toBe(true);
    expect(validateDeck([...filler, FUSION]).some((e) => e.includes('desconhecido') || e.includes('aposentado'))).toBe(true);
    expect(cardInfo(FUSION).frame).toBe('fusion');
    expect(cardInfo(FUSION).typeLine).toBe('Humano / Fusão / Efeito');
  });

  it('com as 5 peças na mão, reúne o time e vence', () => {
    let s = game();
    give(s, 0, MOCORONGO_PIECES);
    expect(getView(s, 0).players[0].canFuse).toEqual([FUSION]);
    expect(getView(s, 1).players[0].canFuse).toBeUndefined();
    const r = applyAction(s, 0, { type: 'fusion', fusionId: FUSION });
    if (!r.ok) throw new Error(r.error);
    s = r.state;
    expect(s.winner).toBe(0);
    expect(s.outcome).toEqual({ reason: 'fusion', loser: 1 });
    expect(s.phase).toBe('ended');
    const p = s.players[0];
    expect(p.hand.some((c) => (MOCORONGO_PIECES as readonly string[]).includes(c.cardId))).toBe(false);
    expect(p.grave.map((c) => c.cardId)).toEqual(expect.arrayContaining([...MOCORONGO_PIECES]));
    expect(p.pros.some((x) => x?.card.cardId === FUSION)).toBe(true);
    expect(s.log.some((l) => l.fx === 'fusion' && l.cardId === FUSION)).toBe(true);
  });

  it('sem zona livre ainda vence (a fusão vai direto para o cemitério)', () => {
    let s = game();
    for (let z = 0; z < 3; z++) s.players[0].pros[z] = newProSlot(newInstance(s, 'qa', 0), 'atk', -5);
    give(s, 0, MOCORONGO_PIECES);
    const r = applyAction(s, 0, { type: 'fusion', fusionId: FUSION });
    if (!r.ok) throw new Error(r.error);
    s = r.state;
    expect(s.winner).toBe(0);
    expect(s.players[0].grave.some((c) => c.cardId === FUSION)).toBe(true);
  });

  it('falha sem todas as peças, fora da Fase Principal ou fora do turno', () => {
    const s = game();
    give(s, 0, MOCORONGO_PIECES.slice(0, 4));
    expect(applyAction(s, 0, { type: 'fusion', fusionId: FUSION })).toMatchObject({ ok: false });
    expect(getView(s, 0).players[0].canFuse).toBeUndefined();

    const full = game();
    give(full, 0, MOCORONGO_PIECES);
    expect(applyAction(full, 1, { type: 'fusion', fusionId: FUSION })).toMatchObject({ ok: false });
    full.phase = 'battle';
    expect(applyAction(full, 0, { type: 'fusion', fusionId: FUSION })).toMatchObject({ ok: false });
    expect(applyAction(game(), 0, { type: 'fusion', fusionId: 'qa' })).toMatchObject({ ok: false });
  });

  it('o descarte por limite de mão poupa as peças', () => {
    const s = game();
    s.players[0].hand = [];
    give(s, 0, MOCORONGO_PIECES);
    give(s, 0, ['qa', 'qa', 'qa', 'qa']);
    const r = applyAction(s, 0, { type: 'endTurn' });
    if (!r.ok) throw new Error(r.error);
    const hand = r.state.players[0].hand.map((c) => c.cardId);
    expect(hand).toHaveLength(7);
    for (const id of MOCORONGO_PIECES) expect(hand).toContain(id);
  });

  it('peças no campo também contam (viradas ou não) e saem do campo na fusão', () => {
    const s = game();
    const onField = ['mocorongo_thy', 'mocorongo_wisley'];
    onField.forEach((id, z) => (s.players[0].pros[z] = newProSlot(newInstance(s, id, 0), 'def', -5, z === 1)));
    give(
      s,
      0,
      MOCORONGO_PIECES.filter((id) => !onField.includes(id)),
    );
    const r = applyAction(s, 0, { type: 'fusion', fusionId: FUSION });
    if (!r.ok) throw new Error(r.error);
    const p = r.state.players[0];
    expect(r.state.outcome?.reason).toBe('fusion');
    expect(p.pros.filter(Boolean).map((x) => x!.card.cardId)).toEqual([FUSION]);
    expect(p.grave.map((c) => c.cardId)).toEqual(expect.arrayContaining([...MOCORONGO_PIECES]));
  });

  it('peça invocada chama outra que ainda falta do deck (1x por turno)', () => {
    let s = createGame({
      players: [
        { name: 'Ana', deck: [...MOCORONGO_PIECES, ...filler.slice(0, 15)] },
        { name: 'Bia', deck: filler },
      ],
      seed: 7,
      first: 0,
    });
    // Mão conhecida: só a cabeça; o deck ainda tem as outras peças.
    const p0 = s.players[0];
    p0.deck.push(...p0.hand.splice(0));
    const head = p0.deck.findIndex((c) => c.cardId === 'mocorongo_thy');
    p0.hand.push(...p0.deck.splice(head, 1));
    const iid = p0.hand[0].iid;
    s = act(s, 0, { type: 'summon', iid, position: 'def', tributes: [] });
    const hand = s.players[0].hand.map((c) => c.cardId);
    expect(hand).toHaveLength(1);
    expect(MOCORONGO_PIECES).toContain(hand[0]);
    expect(hand[0]).not.toBe('mocorongo_thy');
  });

  it('peça destruída volta para a mão: 1x por duelo, contando as 5 peças', () => {
    const s = game();
    const a = newInstance(s, 'mocorongo_thy', 0);
    const b = newInstance(s, 'mocorongo_vitor', 0);
    s.players[0].pros[0] = newProSlot(a, 'atk', -5);
    s.players[0].pros[1] = newProSlot(b, 'atk', -5);
    destroyPro(s, a.iid, { battle: true });
    expect(s.players[0].hand.some((c) => c.iid === a.iid)).toBe(true);
    s.turn += 2;
    destroyPro(s, b.iid, { battle: false, bySeat: 1 });
    expect(s.players[0].grave.some((c) => c.iid === b.iid)).toBe(true);
  });
});

function act(s: GameState, seat: Seat, a: Parameters<typeof applyAction>[2]) {
  const r = applyAction(s, seat, a);
  if (!r.ok) throw new Error(r.error);
  return r.state;
}
