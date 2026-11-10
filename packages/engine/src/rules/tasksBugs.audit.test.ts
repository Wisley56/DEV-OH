import { describe, expect, it } from 'vitest';
import { applyAction, createGame } from '../index';
import { newInstance, newProSlot, other } from '../core/board';
import { card } from '../core/catalog';
import { MAX_STRESS } from '../core/constants';
import type { Action, GameState, Seat } from '../core/types';
import { getAtk, getDef } from './stats';

/**
 * Auditoria das Tasks e dos Bugs: cada card é jogado pelos dois assentos e o teste confere o
 * estado inteiro dos dois jogadores. O que o texto não manda mudar tem de ficar igual, em
 * especial do lado de quem não devia ser afetado.
 */

/** Profissionais sem efeito, para o campo não interferir. */
const VANILLA = ['dev_junior', 'backend_noturno', 'dev_fullstack', 'arquiteta'];
const deck = Array.from({ length: 20 }, (_, i) => VANILLA[i % VANILLA.length]);
const SEATS: Seat[] = [0, 1];

function act(s: GameState, seat: Seat, a: Action): GameState {
  const r = applyAction(s, seat, a);
  if (!r.ok) throw new Error(r.error);
  return r.state;
}
const refused = (s: GameState, seat: Seat, a: Action) => !applyAction(s, seat, a).ok;

/** Turno 2, na Fase Principal de `A` (já pode batalhar). */
function setup(A: Seat, seed = 7): GameState {
  const s = createGame({
    players: [
      { name: 'Ana', deck },
      { name: 'Bia', deck },
    ],
    seed,
    first: other(A),
  });
  return act(s, other(A), { type: 'endTurn' });
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
/** Baixa um Bug/Task virado; por padrão em um turno antigo (já pode disparar). */
function setCard(s: GameState, seat: Seat, cardId: string, setTurn = -5) {
  const c = newInstance(s, cardId, seat);
  s.players[seat].spells[s.players[seat].spells.findIndex((x) => !x)] = { card: c, faceDown: true, revealed: false, setTurn };
  return c.iid;
}

/** Tudo o que um efeito pode mudar em um jogador. */
function snap(s: GameState, seat: Seat) {
  const p = s.players[seat];
  return {
    lp: p.lp,
    stress: p.stress,
    hand: p.hand.map((c) => c.cardId).sort(),
    deck: p.deck.length,
    grave: p.grave.map((c) => c.cardId).sort(),
    pros: p.pros.map((x) =>
      x
        ? {
            id: x.card.cardId,
            pos: x.position,
            down: x.faceDown,
            atk: getAtk(s, seat, x),
            def: getDef(s, seat, x),
            negated: (x.negatedUntilTurn ?? -1) >= s.turn,
            protected: x.protectedTurn === s.turn,
            attacked: x.attackedTurn === s.turn,
          }
        : null,
    ),
    spells: p.spells.map((x) => (x ? { id: x.card.cardId, down: x.faceDown } : null)),
    field: p.field?.card.cardId ?? null,
    noAttack: p.noAttackTurn === s.turn,
  };
}
const slotOf = (s: GameState, seat: Seat, iid: string) => s.players[seat].pros.find((p) => p?.card.iid === iid)!;
const atkOf = (s: GameState, seat: Seat, iid: string) => getAtk(s, seat, slotOf(s, seat, iid));
const defOf = (s: GameState, seat: Seat, iid: string) => getDef(s, seat, slotOf(s, seat, iid));
const onField = (s: GameState, iid: string) => s.players.some((p) => p.pros.some((x) => x?.card.iid === iid));
const base = (id: string) => ({ atk: card(id).atk ?? 0, def: card(id).def ?? 0 });
const graveOf = (s: GameState, seat: Seat) => s.players[seat].grave.map((c) => c.cardId).sort();
const stress = (s: GameState, a: Seat, b: Seat) => [s.players[a].stress, s.players[b].stress];
const lps = (s: GameState, a: Seat, b: Seat) => [s.players[a].lp, s.players[b].lp];
/** O estado de antes, sem a Task que saiu da mão e foi para os Desligados. */
const afterPlaying = (before: ReturnType<typeof snap>, id: string) => ({
  ...before,
  hand: before.hand.filter((x) => x !== id),
  grave: [...before.grave, id].sort(),
});
const noSpells = (before: ReturnType<typeof snap>, grave: string[]) => ({ ...before, spells: before.spells.map(() => null), grave });

describe.each(SEATS)('Tasks jogadas pelo assento %i', (A) => {
  const B = other(A);

  it('Café Extra Forte: −3 de Estresse e +500 ATK só no alvo, nada no oponente', () => {
    const s = setup(A);
    s.players[A].stress = 4;
    s.players[B].stress = 4;
    const mine = place(s, A, 'dev_junior');
    const mine2 = place(s, A, 'backend_noturno');
    const theirs = place(s, B, 'dev_junior');
    const t = hand(s, A, 'cafe');
    const before = snap(s, B);
    expect(refused(s, A, { type: 'activate', iid: t, target: theirs })).toBe(true);
    const r = act(s, A, { type: 'activate', iid: t, target: mine });
    expect(snap(r, B)).toEqual(before);
    expect(r.players[A].stress).toBe(1);
    expect(atkOf(r, A, mine)).toBe(base('dev_junior').atk + 500 + 100);
    expect(atkOf(r, A, mine2)).toBe(base('backend_noturno').atk + 100);
    // O bônus acaba no fim do turno.
    const next = act(r, A, { type: 'endTurn' });
    expect(atkOf(next, A, mine)).toBe(base('dev_junior').atk + 100);
  });

  it('Careca Pensante: +500 ATK nos carecas dos dois lados, e só neles', () => {
    const s = setup(A);
    const myCareca = place(s, A, 'juju');
    const myOther = place(s, A, 'dev_junior');
    const theirCareca = place(s, B, 'moises');
    const theirOther = place(s, B, 'dev_junior');
    const all = (g: GameState) => [atkOf(g, A, myCareca), atkOf(g, A, myOther), atkOf(g, B, theirCareca), atkOf(g, B, theirOther)];
    const a0 = all(s);
    const r = act(s, A, { type: 'activate', iid: hand(s, A, 'careca_pensante') });
    expect(all(r)).toEqual([a0[0] + 500, a0[1], a0[2] + 500, a0[3]]);
    expect(lps(r, A, B)).toEqual(lps(s, A, B));
    expect(stress(r, A, B)).toEqual([0, 0]);
  });

  it('Chama o Thy na DM!: busca o Thy do próprio deck; compra extra só com Vitor no próprio campo', () => {
    const s = setup(A);
    s.players[A].deck.push(newInstance(s, 'thy_revisor', A));
    s.players[B].deck.push(newInstance(s, 'thy_revisor', B));
    place(s, B, 'vitor');
    const t = hand(s, A, 'chama_thy');
    const before = snap(s, B);
    const handBefore = s.players[A].hand.length;
    const r = act(s, A, { type: 'activate', iid: t });
    expect(snap(r, B)).toEqual(before);
    expect(r.players[A].hand.map((c) => c.cardId)).toContain('thy_revisor');
    // Sai a Task, entra o Thy: o Vitor do oponente não dá a compra extra.
    expect(r.players[A].hand).toHaveLength(handBefore);

    const s2 = setup(A);
    s2.players[A].deck.push(newInstance(s2, 'thy_revisor', A));
    place(s2, A, 'vitor');
    const t2 = hand(s2, A, 'chama_thy');
    const h2 = s2.players[A].hand.length;
    const r2 = act(s2, A, { type: 'activate', iid: t2 });
    expect(r2.players[A].hand).toHaveLength(h2 + 1);
  });

  it('Code Review Aprovado: só quem ativou compra 2', () => {
    const s = setup(A);
    const t = hand(s, A, 'code_review');
    const before = snap(s, B);
    const n = s.players[A].hand.length;
    const r = act(s, A, { type: 'activate', iid: t });
    expect(snap(r, B)).toEqual(before);
    expect(r.players[A].hand).toHaveLength(n + 1);
    expect(r.players[A].deck).toHaveLength(s.players[A].deck.length - 2);
  });

  it('Ctrl+Z: +800 ATK só no Profissional escolhido de quem ativou', () => {
    const s = setup(A);
    const mine = place(s, A, 'dev_junior');
    const theirs = place(s, B, 'dev_junior');
    const t = hand(s, A, 'ctrl_z');
    const before = snap(s, B);
    expect(refused(s, A, { type: 'activate', iid: t })).toBe(true);
    expect(refused(s, A, { type: 'activate', iid: t, target: theirs })).toBe(true);
    const r = act(s, A, { type: 'activate', iid: t, target: mine });
    expect(snap(r, B)).toEqual(before);
    expect(atkOf(r, A, mine)).toBe(base('dev_junior').atk + 800);
  });

  it('Daily de 1 Hora: +2 de Estresse para os dois, compra só para quem ativou', () => {
    const s = setup(A);
    const t = hand(s, A, 'daily');
    const n = s.players[A].hand.length;
    const before = snap(s, B);
    const r = act(s, A, { type: 'activate', iid: t });
    expect(stress(r, A, B)).toEqual([2, 2]);
    expect(r.players[A].hand).toHaveLength(n);
    expect(snap(r, B)).toEqual({ ...before, stress: 2 });
    expect(lps(r, A, B)).toEqual(lps(s, A, B));
  });

  it('Deploy na Sexta-Feira: cara fere só o oponente; coroa limpa só o próprio campo', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 40 && seen.size < 2; seed++) {
      const s = setup(A, seed);
      place(s, A, 'dev_junior');
      setCard(s, A, 'erro_404');
      place(s, B, 'dev_junior');
      setCard(s, B, 'erro_404');
      const t = hand(s, A, 'deploy_sexta');
      const beforeA = snap(s, A);
      const beforeB = snap(s, B);
      const r = act(s, A, { type: 'activate', iid: t });
      if (r.players[B].lp < s.players[B].lp) {
        seen.add('cara');
        expect(snap(r, B)).toEqual({ ...beforeB, lp: beforeB.lp - 3000 });
        expect(snap(r, A)).toEqual(afterPlaying(beforeA, 'deploy_sexta'));
      } else {
        seen.add('coroa');
        expect(snap(r, B)).toEqual(beforeB);
        expect(r.players[A].pros.every((x) => !x)).toBe(true);
        expect(r.players[A].spells.every((x) => !x)).toBe(true);
        expect(r.players[A].lp).toBe(s.players[A].lp);
      }
    }
    expect([...seen].sort()).toEqual(['cara', 'coroa']);
  });

  it('Férias Aprovadas: zera o Estresse e proíbe o ataque só de quem ativou, só neste turno', () => {
    const s = setup(A);
    s.players[A].stress = 5;
    s.players[B].stress = 5;
    const mine = place(s, A, 'arquiteta');
    const theirs = place(s, B, 'dev_junior');
    const t = hand(s, A, 'ferias');
    const before = snap(s, B);
    let r = act(s, A, { type: 'activate', iid: t });
    expect(snap(r, B)).toEqual(before);
    expect(r.players[A].stress).toBe(0);
    r = act(r, A, { type: 'goBattle' });
    expect(refused(r, A, { type: 'attack', iid: mine, target: theirs })).toBe(true);
    // O oponente ataca normalmente no turno dele.
    r = act(r, A, { type: 'endTurn' });
    r = act(r, B, { type: 'goBattle' });
    expect(applyAction(r, B, { type: 'attack', iid: theirs, target: mine }).ok).toBe(true);
  });

  it('Fone com Cancelamento de Ruído: +600 DEF só no equipado, sem Estresse no dano de batalha dele', () => {
    const s = setup(A);
    const mine = place(s, A, 'dev_junior');
    const mine2 = place(s, A, 'backend_noturno');
    const theirs = place(s, B, 'arquiteta');
    const t = hand(s, A, 'fone_ruido');
    const before = snap(s, B);
    expect(refused(s, A, { type: 'activate', iid: t, target: theirs })).toBe(true);
    let r = act(s, A, { type: 'activate', iid: t, target: mine });
    expect(snap(r, B)).toEqual(before);
    expect(defOf(r, A, mine)).toBe(base('dev_junior').def + 600);
    expect(defOf(r, A, mine2)).toBe(base('backend_noturno').def);
    expect(atkOf(r, A, mine)).toBe(base('dev_junior').atk);
    // Ataca um mais forte: perde LP, mas não ganha Estresse.
    r = act(r, A, { type: 'goBattle' });
    r = act(r, A, { type: 'attack', iid: mine, target: theirs });
    expect(r.players[A].lp).toBeLessThan(s.players[A].lp);
    expect(stress(r, A, B)).toEqual([0, 0]);
  });

  it('Gato Gordo: +300 ATK e −1 de Estresse por turno só para o dono', () => {
    const s = setup(A);
    s.players[A].stress = 3;
    s.players[B].stress = 3;
    const mine = place(s, A, 'dev_junior');
    const theirs = place(s, B, 'dev_junior');
    const t = hand(s, A, 'gato_gordo');
    const before = snap(s, B);
    let r = act(s, A, { type: 'activate', iid: t });
    expect(snap(r, B)).toEqual(before);
    expect(atkOf(r, A, mine)).toBe(base('dev_junior').atk + 300 + 300);
    expect(atkOf(r, B, theirs)).toBe(base('dev_junior').atk + 300);
    r = act(r, A, { type: 'endTurn' });
    expect(r.players[B].stress).toBe(3);
    r = act(r, B, { type: 'endTurn' });
    expect(stress(r, A, B)).toEqual([2, 3]);
  });

  it('Home Office: −2 de Estresse e +1000 LP só para quem ativou', () => {
    const s = setup(A);
    s.players[A].stress = 3;
    s.players[B].stress = 3;
    const t = hand(s, A, 'home_office');
    const before = snap(s, B);
    const r = act(s, A, { type: 'activate', iid: t });
    expect(snap(r, B)).toEqual(before);
    expect([r.players[A].stress, r.players[A].lp]).toEqual([1, s.players[A].lp + 1000]);
  });

  it('Hotfix: destrói só o card virado escolhido do oponente', () => {
    const s = setup(A);
    const mineSet = setCard(s, A, 'erro_404');
    const theirSet = setCard(s, B, 'erro_404');
    const theirSet2 = setCard(s, B, 'impedimento');
    const t = hand(s, A, 'hotfix');
    expect(refused(s, A, { type: 'activate', iid: t })).toBe(true);
    expect(refused(s, A, { type: 'activate', iid: t, target: mineSet })).toBe(true);
    const beforeA = snap(s, A);
    const r = act(s, A, { type: 'activate', iid: t, target: theirSet });
    expect(r.players[B].spells.filter((x) => x).map((x) => x!.card.iid)).toEqual([theirSet2]);
    expect(graveOf(r, B)).toEqual(['erro_404']);
    expect(snap(r, A)).toEqual(afterPlaying(beforeA, 'hotfix'));
    expect(lps(r, A, B)).toEqual(lps(s, A, B));
    expect(stress(r, A, B)).toEqual([0, 0]);
  });

  it('Juju Sério: −800 DEF só nos Profissionais do oponente em Defesa; +500 ATK só na Juju do dono', () => {
    const s = setup(A);
    const myDef = place(s, A, 'dev_junior', 'def');
    const myJuju = place(s, A, 'juju');
    const theirDef = place(s, B, 'dev_junior', 'def');
    const theirAtk = place(s, B, 'backend_noturno');
    const theirJuju = place(s, B, 'juju');
    const jujuAtk = [atkOf(s, A, myJuju), atkOf(s, B, theirJuju)];
    const r = act(s, A, { type: 'activate', iid: hand(s, A, 'juju_serio') });
    expect(defOf(r, B, theirDef)).toBe(Math.max(0, base('dev_junior').def - 800));
    expect(defOf(r, B, theirAtk)).toBe(base('backend_noturno').def);
    expect(atkOf(r, B, theirAtk)).toBe(base('backend_noturno').atk);
    expect(defOf(r, A, myDef)).toBe(base('dev_junior').def);
    expect([atkOf(r, A, myJuju), atkOf(r, B, theirJuju)]).toEqual([jujuAtk[0] + 500, jujuAtk[1]]);
  });

  it('Estoque de Leite: +300 ATK só nos TERRA do dono; dobra só o Danilo do dono', () => {
    const s = setup(A);
    const myTerra = place(s, A, 'moises');
    const myOther = place(s, A, 'dev_junior');
    const myDanilo = place(s, A, 'danilo');
    const theirTerra = place(s, B, 'moises');
    const theirDanilo = place(s, B, 'danilo');
    const mineAtk = (g: GameState) => [myTerra, myOther, myDanilo].map((i) => atkOf(g, A, i));
    const theirAtk = (g: GameState) => [theirTerra, theirDanilo].map((i) => atkOf(g, B, i));
    const a0 = mineAtk(s);
    const b0 = theirAtk(s);
    const r = act(s, A, { type: 'activate', iid: hand(s, A, 'leite') });
    expect(mineAtk(r)).toEqual([a0[0] + 300, a0[1], a0[2] + base('danilo').atk + 300]);
    expect(theirAtk(r)).toEqual(b0);
  });

  it('A Mão do Moisés: acerto derruba só Tasks/Bugs/Campo do oponente; erro pega só um Profissional do dono', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 40 && seen.size < 2; seed++) {
      const s = setup(A, seed);
      place(s, A, 'dev_junior');
      setCard(s, A, 'erro_404');
      place(s, B, 'dev_junior');
      setCard(s, B, 'erro_404');
      setCard(s, B, 'impedimento');
      const t = hand(s, A, 'mao_moises');
      const beforeA = snap(s, A);
      const beforeB = snap(s, B);
      const r = act(s, A, { type: 'activate', iid: t });
      if (r.players[B].spells.every((x) => !x)) {
        seen.add('acerto');
        expect(snap(r, B)).toEqual(noSpells(beforeB, ['erro_404', 'impedimento']));
        expect(snap(r, A)).toEqual(afterPlaying(beforeA, 'mao_moises'));
      } else {
        seen.add('erro');
        expect(snap(r, B)).toEqual(beforeB);
        const hit = snap(r, A).pros.find((x) => x)!;
        expect([hit.pos, hit.negated]).toEqual(['def', true]);
        expect(snap(r, A).spells).toEqual(beforeA.spells);
      }
    }
    expect([...seen].sort()).toEqual(['acerto', 'erro']);
  });

  it('Moisés Bombado: dobra ATK e DEF só do equipado e sai no fim do turno', () => {
    const s = setup(A);
    const mine = place(s, A, 'dev_junior');
    const mine2 = place(s, A, 'backend_noturno');
    const theirs = place(s, B, 'dev_junior');
    const t = hand(s, A, 'moises_bombado');
    const before = snap(s, B);
    let r = act(s, A, { type: 'activate', iid: t, target: mine });
    expect(snap(r, B)).toEqual(before);
    expect([atkOf(r, A, mine), defOf(r, A, mine)]).toEqual([base('dev_junior').atk * 2, base('dev_junior').def * 2]);
    expect(atkOf(r, A, mine2)).toBe(base('backend_noturno').atk);
    expect(atkOf(r, B, theirs)).toBe(base('dev_junior').atk);
    r = act(r, A, { type: 'endTurn' });
    expect(atkOf(r, A, mine)).toBe(base('dev_junior').atk);
    expect(r.players[A].spells.every((x) => !x)).toBe(true);
  });

  it('Moisés Bombado baixado: equipa o atacado quando o oponente ataca, e não o atacante', () => {
    const s = setup(A);
    const attacker = place(s, A, 'backend_noturno');
    const target = place(s, B, 'dev_junior');
    setCard(s, B, 'moises_bombado');
    let r = act(s, A, { type: 'goBattle' });
    r = act(r, A, { type: 'attack', iid: attacker, target });
    // 1800 contra 1500×2: o atacante perde e leva a diferença.
    expect([onField(r, target), onField(r, attacker)]).toEqual([true, false]);
    expect(r.players[A].lp).toBe(s.players[A].lp - (base('dev_junior').atk * 2 - base('backend_noturno').atk));
    expect(r.players[B].lp).toBe(s.players[B].lp);
  });

  it('Pair Programming: protege só o Profissional escolhido de quem ativou', () => {
    const s = setup(A);
    const mine = place(s, A, 'dev_junior');
    const theirs = place(s, B, 'arquiteta');
    const t = hand(s, A, 'pair_programming');
    const before = snap(s, B);
    expect(refused(s, A, { type: 'activate', iid: t, target: theirs })).toBe(true);
    let r = act(s, A, { type: 'activate', iid: t, target: mine });
    expect(snap(r, B)).toEqual(before);
    r = act(r, A, { type: 'goBattle' });
    r = act(r, A, { type: 'attack', iid: mine, target: theirs });
    expect([onField(r, mine), onField(r, theirs)]).toEqual([true, true]);
    expect(lps(r, A, B)).toEqual(lps(s, A, B));
  });

  it('Refatoração Holística: destrói só o alvo do oponente; +2 de Estresse só em quem ativou', () => {
    const s = setup(A);
    const mine = place(s, A, 'dev_junior');
    const theirs = place(s, B, 'dev_junior');
    const theirs2 = place(s, B, 'backend_noturno');
    const t = hand(s, A, 'refatoracao');
    expect(refused(s, A, { type: 'activate', iid: t, target: mine })).toBe(true);
    expect(refused(s, A, { type: 'activate', iid: t })).toBe(true);
    const r = act(s, A, { type: 'activate', iid: t, target: theirs });
    expect([onField(r, mine), onField(r, theirs), onField(r, theirs2)]).toEqual([true, false, true]);
    expect(stress(r, A, B)).toEqual([2, 0]);
    expect(lps(r, A, B)).toEqual(lps(s, A, B));
  });

  it('Reunião que Podia Ser um E-mail: +2 de Estresse e Defesa só no oponente', () => {
    const s = setup(A);
    const mine = place(s, A, 'dev_junior');
    place(s, B, 'dev_junior');
    const theirs = s.players[B].pros.find((x) => x)!.card.iid;
    const t = hand(s, A, 'reuniao');
    const beforeA = snap(s, A);
    expect(refused(s, A, { type: 'activate', iid: t, target: mine })).toBe(true);
    const r = act(s, A, { type: 'activate', iid: t, target: theirs });
    expect(stress(r, A, B)).toEqual([0, 2]);
    expect(slotOf(r, B, theirs).position).toBe('def');
    expect(snap(r, A)).toEqual(afterPlaying(beforeA, 'reuniao'));
  });

  it('Teclado Mecânico RGB: +500 ATK só no equipado e sai de campo junto com ele', () => {
    const s = setup(A);
    const mine = place(s, A, 'dev_junior');
    const mine2 = place(s, A, 'backend_noturno');
    const theirs = place(s, B, 'arquiteta');
    const t = hand(s, A, 'teclado_rgb');
    const before = snap(s, B);
    expect(refused(s, A, { type: 'activate', iid: t, target: theirs })).toBe(true);
    let r = act(s, A, { type: 'activate', iid: t, target: mine });
    expect(snap(r, B)).toEqual(before);
    expect(atkOf(r, A, mine)).toBe(base('dev_junior').atk + 500);
    expect(atkOf(r, A, mine2)).toBe(base('backend_noturno').atk);
    r = act(r, A, { type: 'goBattle' });
    r = act(r, A, { type: 'attack', iid: mine, target: theirs });
    expect(onField(r, mine)).toBe(false);
    expect(r.players[A].spells.every((x) => !x)).toBe(true);
    expect(graveOf(r, A)).toEqual(['dev_junior', 'teclado_rgb']);
  });
});

describe.each(SEATS)('Bugs do assento %i (o outro assento joga)', (B) => {
  const A = other(B);
  const bugStill = (s: GameState, seat: Seat) => s.players[seat].spells.find((x) => x);

  it('Dívida Técnica: −300 ATK só nos Profissionais de quem invocou; não dispara na invocação do dono', () => {
    const s = setup(A);
    const mine = place(s, B, 'dev_junior');
    setCard(s, B, 'divida_tecnica');
    const old = place(s, A, 'backend_noturno');
    const summoned = hand(s, A, 'dev_junior');
    let r = act(s, A, { type: 'summon', iid: summoned, position: 'atk' });
    expect(atkOf(r, A, summoned)).toBe(base('dev_junior').atk - 300);
    expect(atkOf(r, A, old)).toBe(base('backend_noturno').atk - 300);
    expect(atkOf(r, B, mine)).toBe(base('dev_junior').atk);
    expect(bugStill(r, B)).toMatchObject({ faceDown: false });
    expect(lps(r, A, B)).toEqual(lps(s, A, B));
    expect(stress(r, A, B)).toEqual([0, 0]);
    // O dono invoca no turno dele: nada dispara contra ele.
    const s2 = setup(B);
    setCard(s2, B, 'divida_tecnica');
    const own = hand(s2, B, 'dev_junior');
    r = act(s2, B, { type: 'summon', iid: own, position: 'atk' });
    expect(atkOf(r, B, own)).toBe(base('dev_junior').atk);
    expect(bugStill(r, B)).toMatchObject({ faceDown: true });
  });

  it('Erro 404: destrói o atacante no ataque direto, sem dano; não dispara contra um Profissional', () => {
    const s = setup(A);
    const attacker = place(s, A, 'dev_junior');
    setCard(s, B, 'erro_404');
    const before = snap(s, B);
    let r = act(s, A, { type: 'goBattle' });
    r = act(r, A, { type: 'attack', iid: attacker });
    expect(onField(r, attacker)).toBe(false);
    expect(snap(r, B)).toEqual(noSpells(before, ['erro_404']));
    expect([r.players[A].lp, r.players[A].stress]).toEqual([s.players[A].lp, 0]);

    const s2 = setup(A);
    const atk2 = place(s2, A, 'backend_noturno');
    const target = place(s2, B, 'dev_junior');
    setCard(s2, B, 'erro_404');
    r = act(s2, A, { type: 'goBattle' });
    r = act(r, A, { type: 'attack', iid: atk2, target });
    expect(onField(r, atk2)).toBe(true);
    expect(bugStill(r, B)).toMatchObject({ faceDown: true });
  });

  it('A IA Fez Cagada: −1000 ATK no invocado e +1 de Estresse só em quem invocou; [IA] é destruído', () => {
    const s = setup(A);
    const mine = place(s, B, 'dev_junior');
    setCard(s, B, 'ia_fez_cagada');
    const summoned = hand(s, A, 'dev_junior');
    let r = act(s, A, { type: 'summon', iid: summoned, position: 'atk' });
    expect(atkOf(r, A, summoned)).toBe(base('dev_junior').atk - 1000 + 100);
    expect(atkOf(r, B, mine)).toBe(base('dev_junior').atk);
    expect(stress(r, A, B)).toEqual([1, 0]);

    const s2 = setup(A);
    setCard(s2, B, 'ia_fez_cagada');
    const ia = hand(s2, A, 'copilot');
    r = act(s2, A, { type: 'summon', iid: ia, position: 'atk' });
    expect(onField(r, ia)).toBe(false);
    expect(stress(r, A, B)).toEqual([1, 0]);
  });

  it('Impedimento de Última Hora: nega o ataque e encerra a Batalha só do atacante', () => {
    const s = setup(A);
    const a1 = place(s, A, 'backend_noturno');
    const a2 = place(s, A, 'dev_fullstack');
    const target = place(s, B, 'dev_junior');
    setCard(s, B, 'impedimento');
    const before = snap(s, B);
    let r = act(s, A, { type: 'goBattle' });
    r = act(r, A, { type: 'attack', iid: a1, target });
    expect(snap(r, B)).toEqual(noSpells(before, ['impedimento']));
    expect([r.players[A].lp, r.players[A].stress]).toEqual([s.players[A].lp, 0]);
    expect(refused(r, A, { type: 'attack', iid: a2, target })).toBe(true);
    // No turno seguinte o dono do Bug ataca normalmente.
    r = act(r, A, { type: 'endTurn' });
    r = act(r, B, { type: 'goBattle' });
    expect(applyAction(r, B, { type: 'attack', iid: target, target: a1 }).ok).toBe(true);
  });

  it('Merge Conflict: anula a Task e dá +1 de Estresse aos dois (está no texto)', () => {
    const s = setup(A);
    setCard(s, B, 'merge_conflict');
    const t = hand(s, A, 'home_office');
    const r = act(s, A, { type: 'activate', iid: t });
    expect(r.players[A].lp).toBe(s.players[A].lp);
    expect(stress(r, A, B)).toEqual([1, 1]);
    expect(graveOf(r, A)).toEqual(['home_office']);
    expect(graveOf(r, B)).toEqual(['merge_conflict']);
  });

  it('Na Minha Máquina Funciona: zera o dano de batalha do dono e −1 de Estresse só nele', () => {
    const s = setup(A);
    s.players[A].stress = 2;
    s.players[B].stress = 2;
    const attacker = place(s, A, 'dev_junior');
    setCard(s, B, 'minha_maquina');
    let r = act(s, A, { type: 'goBattle' });
    r = act(r, A, { type: 'attack', iid: attacker });
    expect(lps(r, A, B)).toEqual(lps(s, A, B));
    expect(stress(r, A, B)).toEqual([2, 1]);

    // Quem leva o dano é o atacante: o Bug do defensor fica quieto.
    const s2 = setup(A);
    const weak = place(s2, A, 'dev_junior');
    const wall = place(s2, B, 'arquiteta');
    setCard(s2, B, 'minha_maquina');
    r = act(s2, A, { type: 'goBattle' });
    r = act(r, A, { type: 'attack', iid: weak, target: wall });
    expect(r.players[A].lp).toBeLessThan(s2.players[A].lp);
    expect(bugStill(r, B)).toMatchObject({ faceDown: true });
  });

  it('Mudança de Escopo: o atacante volta para a mão do dono dele', () => {
    const s = setup(A);
    const attacker = place(s, A, 'backend_noturno');
    const target = place(s, B, 'dev_junior');
    setCard(s, B, 'mudanca_escopo');
    const before = snap(s, B);
    const n = s.players[A].hand.length;
    let r = act(s, A, { type: 'goBattle' });
    r = act(r, A, { type: 'attack', iid: attacker, target });
    expect(snap(r, B)).toEqual(noSpells(before, ['mudanca_escopo']));
    expect(onField(r, attacker)).toBe(false);
    expect(r.players[A].hand).toHaveLength(n + 1);
    expect(r.players[A].hand.some((c) => c.iid === attacker)).toBe(true);
    expect([r.players[A].lp, r.players[A].stress]).toEqual([s.players[A].lp, 0]);
  });

  it('Prod Caiu: 800 de dano e +2 de Estresse só em quem destruiu; não dispara quando o destruído é do outro', () => {
    const s = setup(A);
    const attacker = place(s, A, 'backend_noturno');
    const target = place(s, B, 'dev_junior', 'def');
    setCard(s, B, 'prod_caiu');
    let r = act(s, A, { type: 'goBattle' });
    r = act(r, A, { type: 'attack', iid: attacker, target });
    expect(onField(r, target)).toBe(false);
    expect([r.players[A].lp, r.players[A].stress]).toEqual([s.players[A].lp - 800, 2]);
    expect([r.players[B].lp, r.players[B].stress]).toEqual([s.players[B].lp, 0]);

    const s2 = setup(A);
    const weak = place(s2, A, 'dev_junior');
    const strong = place(s2, B, 'arquiteta');
    setCard(s2, B, 'prod_caiu');
    r = act(s2, A, { type: 'goBattle' });
    r = act(r, A, { type: 'attack', iid: weak, target: strong });
    expect(onField(r, weak)).toBe(false);
    expect(bugStill(r, B)).toMatchObject({ faceDown: true });
    expect(r.players[B].lp).toBe(s2.players[B].lp);
  });

  it('Revert do PR: anula o Bug do oponente e dá +1 de Estresse só a quem reverteu', () => {
    // Aqui `B` é o dono do Revert e ataca; `A` defende com o Impedimento.
    const s = setup(B);
    const attacker = place(s, B, 'backend_noturno');
    const target = place(s, A, 'dev_junior');
    setCard(s, A, 'impedimento');
    setCard(s, B, 'revert_pr');
    let r = act(s, B, { type: 'goBattle' });
    r = act(r, B, { type: 'attack', iid: attacker, target });
    expect(onField(r, target)).toBe(false);
    // +1 de quem reverteu; o defensor ganha +1 pelo dano de batalha que levou.
    expect(stress(r, B, A)).toEqual([1, 1]);
    expect(graveOf(r, A)).toEqual(['dev_junior', 'impedimento']);
    expect(graveOf(r, B)).toEqual(['revert_pr']);
    // O +1 de Estresse do Revert já vale no ataque (Modo Desespero: +100 ATK).
    expect(r.players[A].lp).toBe(s.players[A].lp - (base('backend_noturno').atk + 100 - base('dev_junior').atk));
  });

  it('Bug baixado neste turno não dispara', () => {
    const s = setup(A);
    const attacker = place(s, A, 'dev_junior');
    setCard(s, B, 'erro_404', s.turn);
    let r = act(s, A, { type: 'goBattle' });
    r = act(r, A, { type: 'attack', iid: attacker });
    expect(onField(r, attacker)).toBe(true);
    expect(r.players[B].lp).toBe(s.players[B].lp - base('dev_junior').atk);
  });

  it('só um Bug dispara por evento', () => {
    const s = setup(A);
    const attacker = place(s, A, 'backend_noturno');
    const target = place(s, B, 'dev_junior');
    setCard(s, B, 'impedimento');
    setCard(s, B, 'mudanca_escopo');
    let r = act(s, A, { type: 'goBattle' });
    r = act(r, A, { type: 'attack', iid: attacker, target });
    expect(r.players[B].spells.filter((x) => x)).toHaveLength(1);
    expect(onField(r, attacker)).toBe(true);
  });
});

describe.each(SEATS)('Estresse que volta para quem jogou (assento %i joga)', (A) => {
  const B = other(A);

  it('Douglas (Dois Tipos de Problemas) devolve o Estresse, uma vez por turno', () => {
    const s = setup(A);
    place(s, B, 'douglas_problemas');
    const t1 = hand(s, A, 'reuniao');
    const t2 = hand(s, A, 'reuniao');
    let r = act(s, A, { type: 'activate', iid: t1 });
    expect(stress(r, A, B)).toEqual([2, 0]);
    r = act(r, A, { type: 'activate', iid: t2 });
    expect(stress(r, A, B)).toEqual([2, 2]);
  });

  it('Daily contra o Douglas: quem ativou fica com os +2 dele e os +2 devolvidos', () => {
    const s = setup(A);
    place(s, B, 'douglas_problemas');
    const r = act(s, A, { type: 'activate', iid: hand(s, A, 'daily') });
    expect(stress(r, A, B)).toEqual([4, 0]);
  });

  it('Douglas virado para baixo não devolve nada', () => {
    const s = setup(A);
    const c = newInstance(s, 'douglas_problemas', B);
    s.players[B].pros[0] = newProSlot(c, 'def', -5, true);
    const r = act(s, A, { type: 'activate', iid: hand(s, A, 'reuniao') });
    expect(stress(r, A, B)).toEqual([0, 2]);
  });

  it(`Estresse ${MAX_STRESS} por Task própria: o Profissional de maior nível de quem estourou pede demissão`, () => {
    const s = setup(A);
    s.players[A].stress = MAX_STRESS - 2;
    const low = place(s, A, 'dev_junior');
    const high = place(s, A, 'arquiteta');
    const theirs = place(s, B, 'arquiteta');
    const r = act(s, A, { type: 'activate', iid: hand(s, A, 'daily') });
    expect([onField(r, low), onField(r, high), onField(r, theirs)]).toEqual([true, false, true]);
    expect(stress(r, A, B)).toEqual([0, 2]);
  });
});
