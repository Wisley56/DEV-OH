import { createGame, getView, STARTER_DECKS, type GameView, type ProView } from '@devoh/engine';
import { describe, expect, it } from 'vitest';
import {
  battleForecast,
  canDropOn,
  cardActions,
  isTargetable,
  isTargetOptional,
  modeText,
  modLines,
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

  it('Profissional pode ser baixado virado; virado no campo faz a Invocação-Virar', () => {
    const base = view();
    const h = { iid: 'x1', cardId: 'vitor', canSummon: true, canActivate: false, canSet: true };
    const pro = {
      iid: 'x2',
      cardId: 'qa',
      position: 'def' as const,
      faceDown: true,
      atk: 1600,
      def: 1400,
      canAttack: false,
      canChangePos: false,
      canIgnite: false,
      canFlip: true,
      locked: false,
    };
    const me = { ...base.players[0], hand: [h], pros: [pro, null, null] };
    const v = { ...base, players: [me, base.players[1]] as GameView['players'] };
    expect(cardActions(v, { iid: h.iid, cardId: h.cardId, where: 'hand' }).actions.map((a) => a.label)).toEqual([
      'Invocar em Ataque',
      'Invocar em Defesa',
      'Baixar virado (Defesa)',
    ]);
    const { actions } = cardActions(v, { iid: pro.iid, cardId: pro.cardId, where: 'myPro' });
    expect(actions.map((a) => a.intent)).toEqual([{ kind: 'flipSummon', iid: pro.iid }]);
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

describe('arrastar da mão para o campo', () => {
  const me = view().players[0];
  const hand = (cardId: string, flags: Partial<{ canSummon: boolean; canActivate: boolean; canSet: boolean }> = {}) => ({
    iid: 'h1',
    cardId,
    canSummon: false,
    canActivate: false,
    canSet: false,
    ...flags,
  });

  it('Profissional só em zona de Profissional livre (com sacrifício, qualquer uma)', () => {
    const busy = { ...me, pros: [{ iid: 'x' }, null, null] as unknown as typeof me.pros };
    expect(canDropOn(hand('qa', { canSummon: true }), { row: 'pro', zone: 1 }, busy)).toBe(true);
    expect(canDropOn(hand('qa', { canSummon: true }), { row: 'pro', zone: 0 }, busy)).toBe(false);
    expect(canDropOn(hand('qa', { canSummon: true }), { row: 'spell', zone: 1 }, busy)).toBe(false);
    expect(canDropOn(hand('qa'), { row: 'pro', zone: 1 }, busy)).toBe(false);
    expect(canDropOn(hand('danilo', { canSummon: true }), { row: 'pro', zone: 0 }, busy)).toBe(true);
  });

  it('Bug em zona de Task/Bug livre; Task normal em qualquer zona de Task ou Campo', () => {
    expect(canDropOn(hand('erro_404', { canSet: true }), { row: 'spell', zone: 0 }, me)).toBe(true);
    expect(canDropOn(hand('erro_404', { canSet: true }), { row: 'field', zone: 0 }, me)).toBe(false);
    expect(canDropOn(hand('hotfix', { canActivate: true }), { row: 'field', zone: 0 }, me)).toBe(true);
    expect(canDropOn(hand('hotfix', { canActivate: true }), { row: 'pro', zone: 0 }, me)).toBe(false);
  });
});

describe('previsão de batalha', () => {
  const pro = (over: Partial<ProView>): ProView => ({
    iid: 'x',
    cardId: 'qa',
    position: 'atk',
    faceDown: false,
    atk: 1600,
    def: 1200,
    canAttack: false,
    canChangePos: false,
    canIgnite: false,
    canFlip: false,
    locked: false,
    ...over,
  });

  it('contra um Profissional em Ataque: compara ATK com ATK', () => {
    expect(battleForecast(pro({ atk: 1800 }), pro({ atk: 1500 }))).toEqual({ tone: 'good', text: 'Destrói · −300 LP nele' });
    expect(battleForecast(pro({ atk: 1500 }), pro({ atk: 1800 }))).toEqual({ tone: 'bad', text: 'Perde o seu · −300 LP em você' });
    expect(battleForecast(pro({ atk: 1500 }), pro({ atk: 1500 }))).toEqual({ tone: 'even', text: 'Os dois caem' });
  });

  it('contra um Profissional em Defesa: compara ATK com DEF, sem dano no dono do alvo', () => {
    expect(battleForecast(pro({ atk: 1800 }), pro({ position: 'def', def: 1500 }))).toEqual({ tone: 'good', text: 'Destrói' });
    expect(battleForecast(pro({ atk: 1500 }), pro({ position: 'def', def: 1900 }))).toEqual({
      tone: 'bad',
      text: 'Não passa · −400 LP em você',
    });
    expect(battleForecast(pro({ atk: 1500 }), pro({ position: 'def', def: 1500 }))).toEqual({ tone: 'even', text: 'Não passa' });
  });

  it('alvo virado não revela nada', () => {
    expect(battleForecast(pro({}), pro({ cardId: null, faceDown: true, position: 'def', atk: null, def: null }))).toEqual({
      tone: 'unknown',
      text: 'Virado: ?',
    });
  });
});

describe('de onde vem o ATK/DEF', () => {
  it('nomeia a regra ou o card e mostra cada valor com sinal', () => {
    expect(
      modLines([
        { rule: 'stress', atk: 200 },
        { cardId: 'gato_gordo', atk: 300 },
        { cardId: 'juju_serio', def: -800 },
        { cardId: 'moises_bombado', mult: 2 },
      ]),
    ).toEqual([
      { label: 'Estresse (Modo Desespero)', values: ['+200 ATK'], good: true },
      { label: 'Contemplai… o Gato Gordo da Squad!', values: ['+300 ATK'], good: true },
      { label: 'Juju Sério', values: ['−800 DEF'], good: false },
      { label: 'Moisés Bombado', values: ['×2 ATK e DEF'], good: true },
    ]);
    expect(modLines(undefined)).toEqual([]);
  });
});
