import { applyAction, createGame, getView, STARTER_DECKS, type GameState } from '@devoh/engine';
import { describe, expect, it } from 'vitest';
import { duelSummary } from './duelSummary';

const game = () =>
  createGame({
    players: [
      { name: 'Ana', deck: STARTER_DECKS[0].cards },
      { name: 'Bia', deck: STARTER_DECKS[1].cards },
    ],
    seed: 3,
    first: 0,
  });

const play = (s: GameState, seat: 0 | 1, a: Parameters<typeof applyAction>[2]) => {
  const r = applyAction(s, seat, a);
  if (!r.ok) throw new Error(r.error);
  return r.state;
};

describe('resumo do fim do duelo', () => {
  it('não existe enquanto o duelo continua', () => {
    expect(duelSummary(getView(game(), 0))).toBeNull();
  });

  it('explica a desistência para os dois lados', () => {
    const s = play(game(), 1, { type: 'surrender' });
    const ana = duelSummary(getView(s, 0))!;
    const bia = duelSummary(getView(s, 1))!;
    expect(ana).toMatchObject({ tone: 'win', title: 'SPRINT ENTREGUE!', headline: 'Bia desistiu do duelo.' });
    expect(bia).toMatchObject({ tone: 'lose', headline: 'Você desistiu do duelo.' });
  });

  it('LP zerado: manchete e a sequência do último turno, com o lado de cada passo', () => {
    let s = game();
    s = play(s, 0, { type: 'endTurn' });
    // Força o fim por LP: Ana com pouco LP e Bia atacando direto com um Profissional pronto.
    s.players[0].lp = 300;
    const hand = s.players[1].hand.find((c) => c.cardId && ['estagiario', 'backend_noturno', 'qa'].includes(c.cardId));
    const pro = hand ?? s.players[1].hand[0];
    s.players[1].pros[0] = {
      card: pro,
      position: 'atk',
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
    s.players[1].hand = s.players[1].hand.filter((c) => c !== pro);
    s = play(s, 1, { type: 'goBattle' });
    s = play(s, 1, { type: 'attack', iid: pro.iid });
    const sum = duelSummary(getView(s, 0))!;
    expect(sum.tone).toBe('lose');
    expect(sum.headline).toBe('Seus LP chegaram a 0.');
    expect(sum.lp.me).toBeLessThanOrEqual(0);
    const kinds = sum.steps.map((x) => x.kind);
    expect(kinds).toContain('attack');
    expect(kinds).toContain('damage');
    expect(sum.steps.find((x) => x.kind === 'attack')).toMatchObject({ side: 'opp', cardId: pro.cardId });
    expect(sum.steps.find((x) => x.kind === 'damage')).toMatchObject({ side: 'me' });
  });
});
