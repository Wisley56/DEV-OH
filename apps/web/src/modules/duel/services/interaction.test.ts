import { createGame, getView, STARTER_DECKS, type GameView } from '@devoh/engine';
import { describe, expect, it } from 'vitest';
import {
  cardActions,
  isTargetable,
  isTargetOptional,
  modeText,
  selectionExists,
  toggleTribute,
  winnerText,
  zoneMatchesTarget,
  type Mode,
} from './interaction';

const view = (): GameView => {
  const s = createGame({
    players: [
      { name: 'Ana', deck: STARTER_DECKS[0].cards },
      { name: 'Bia', deck: STARTER_DECKS[1].cards },
    ],
    seed: 7,
    first: 0,
  });
  return getView(s, 0);
};

describe('interação do tabuleiro', () => {
  it('lista as ações de um card da mão no meu turno', () => {
    const base = view();
    const h = { iid: 'x1', cardId: 'vitor', canSummon: true, canActivate: false, canSet: false };
    const v = { ...base, players: [{ ...base.players[0], hand: [h] }, base.players[1]] as GameView['players'] };
    const { actions } = cardActions(v, { iid: h.iid, cardId: h.cardId, where: 'hand' });
    expect(actions.map((a) => a.label)).toEqual(['Invocar em Ataque', 'Invocar em Defesa']);
    expect(actions[0].intent).toEqual({ kind: 'summon', iid: h.iid, cardId: h.cardId, position: 'atk' });
  });

  it('sem ações fora do meu turno', () => {
    const v = { ...view(), active: 1 as const };
    const h = v.players[0].hand![0];
    expect(cardActions(v, { iid: h.iid, cardId: h.cardId, where: 'hand' }).actions).toEqual([]);
  });

  it('explica por que um Profissional de nível alto não entra', () => {
    const v = view();
    const hand = [{ iid: 'x1', cardId: 'thy_revisor', canSummon: false, canActivate: false, canSet: false }];
    const v2 = { ...v, players: [{ ...v.players[0], hand }, v.players[1]] as GameView['players'] };
    expect(cardActions(v2, { iid: 'x1', cardId: 'thy_revisor', where: 'hand' }).hint).toMatch(/Nível 7: precisa sacrificar 2/);
  });

  it('alvo obrigatório vem do catálogo; efeito ativável sempre exige', () => {
    expect(isTargetOptional('cafe', 'card')).toBe(true);
    expect(isTargetOptional('refatoracao', 'card')).toBe(false);
    expect(isTargetOptional('hotfix', 'card')).toBe(false);
    expect(isTargetOptional('copilot', 'ignition')).toBe(false);
  });

  it('zonas válidas para cada tipo de alvo', () => {
    expect(zoneMatchesTarget('oppPro', 'oppPro')).toBe(true);
    expect(zoneMatchesTarget('oppPro', 'myPro')).toBe(false);
    expect(zoneMatchesTarget('anyPro', 'myPro')).toBe(true);
    expect(zoneMatchesTarget('oppSet', 'oppSpell')).toBe(true);
    const opp = view().players[1];
    const attack: Mode = { kind: 'attack', iid: 'a' };
    expect(isTargetable(attack, 'oppPro', 'x', opp)).toBe(true);
    expect(isTargetable(attack, 'myPro', 'x', opp)).toBe(false);
    expect(isTargetable(null, 'oppPro', 'x', opp)).toBe(false);
  });

  it('marca sacrifícios até completar', () => {
    const mode = {
      kind: 'tribute' as const,
      base: { type: 'summon' as const, iid: 'h', position: 'atk' as const, tributes: [] },
      need: 2,
      chosen: [],
    };
    const one = toggleTribute(mode, 'p1');
    expect(one).toEqual({ chosen: ['p1'], done: false });
    expect(toggleTribute({ ...mode, chosen: one.chosen }, 'p1')).toEqual({ chosen: [], done: false });
    expect(toggleTribute({ ...mode, chosen: one.chosen }, 'p2')).toEqual({ chosen: ['p1', 'p2'], done: true });
    expect(modeText({ ...mode, chosen: ['p1'] })).toBe('Escolha 1 Profissional(is) seu(s) para sacrificar');
  });

  it('seleção some quando o card sai e texto de vitória', () => {
    const v = view();
    expect(selectionExists(v, { iid: v.players[0].hand![0].iid, cardId: null, where: 'hand' })).toBe(true);
    expect(selectionExists(v, { iid: 'sumiu', cardId: null, where: 'myPro' })).toBe(false);
    expect(winnerText(v)).toBeNull();
    expect(winnerText({ ...v, winner: 0 })).toBe('SPRINT ENTREGUE!');
    expect(winnerText({ ...v, winner: 1 })).toBe('PROJETO CANCELADO…');
    expect(winnerText({ ...v, winner: 'draw' })).toBe('EMPATE');
  });
});
