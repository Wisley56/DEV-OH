import { describe, expect, it } from 'vitest';
import { applyAction, createGame, forfeit, fullTypeLine, getView, STARTER_DECKS, validateDeck, CARD_LIST } from '../index';
import { newInstance, newProSlot } from '../core/board';
import { destroyPro } from './zones';
import type { Action, GameState, Seat } from '../core/types';

const filler = Array(20)
  .fill('backend_noturno')
  .map((_, i) => (i % 2 ? 'backend_noturno' : 'qa'));

function game(opts: { seed?: number; deck0?: string[]; deck1?: string[] } = {}) {
  return createGame({
    players: [
      { name: 'Ana', deck: opts.deck0 ?? filler },
      { name: 'Bia', deck: opts.deck1 ?? filler },
    ],
    seed: opts.seed ?? 42,
    first: 0,
  });
}

function act(s: GameState, seat: Seat, a: Action): GameState {
  const r = applyAction(s, seat, a);
  if (!r.ok) throw new Error(r.error);
  return r.state;
}

function place(s: GameState, seat: Seat, cardId: string, position: 'atk' | 'def' = 'atk', zone?: number) {
  const c = newInstance(s, cardId, seat);
  const z = zone ?? s.players[seat].pros.findIndex((x) => !x);
  s.players[seat].pros[z] = newProSlot(c, position, -5);
  return c.iid;
}

function giveHand(s: GameState, seat: Seat, cardId: string) {
  const c = newInstance(s, cardId, seat);
  s.players[seat].hand.push(c);
  return c.iid;
}

function setBug(s: GameState, seat: Seat, cardId: string) {
  const c = newInstance(s, cardId, seat);
  const z = s.players[seat].spells.findIndex((x) => !x);
  s.players[seat].spells[z] = { card: c, faceDown: true, revealed: false, setTurn: -5 };
  return c.iid;
}

/** Avança até o turno do jogador 1 (turno 2) e entra em batalha. */
function toTurn2Battle(s: GameState) {
  s = act(s, 0, { type: 'endTurn' });
  return act(s, 1, { type: 'goBattle' });
}

describe('decks', () => {
  it('decks iniciais são válidos', () => {
    for (const d of STARTER_DECKS) expect(validateDeck(d.cards), d.name).toEqual([]);
  });
  it('rejeita pessoa duplicada e deck pequeno', () => {
    const errs = validateDeck(['thy_revisor', 'thy_revisor']);
    expect(errs.some((e) => e.includes('pelo menos'))).toBe(true);
    expect(errs.some((e) => e.includes('máximo 1'))).toBe(true);
  });
  it('toda arte e texto definidos', () => {
    for (const c of CARD_LIST) {
      expect(c.art, c.id).toBeTruthy();
      expect(c.text.length, c.id).toBeGreaterThan(10);
    }
  });
});

describe('fluxo básico', () => {
  it('começa com 4 cards, primeiro jogador não compra', () => {
    const s = game();
    expect(s.players[0].hand).toHaveLength(4);
    expect(s.players[1].hand).toHaveLength(4);
    expect(s.active).toBe(0);
    const s2 = act(s, 0, { type: 'endTurn' });
    expect(s2.players[1].hand).toHaveLength(5);
  });
  it('não tem batalha no turno 1', () => {
    expect(applyAction(game(), 0, { type: 'goBattle' }).ok).toBe(false);
  });
  it('não pode agir fora do turno', () => {
    expect(applyAction(game(), 1, { type: 'endTurn' }).ok).toBe(false);
  });
  it('view esconde a mão e os bugs do oponente', () => {
    const s = game();
    setBug(s, 1, 'erro_404');
    const v = getView(s, 0);
    expect(v.players[1].hand).toBeNull();
    expect(v.players[1].handCount).toBe(4);
    expect(v.players[1].spells[0]?.cardId).toBeNull();
    expect(getView(s, 1).players[1].spells[0]?.cardId).toBe('erro_404');
  });
});

describe('invocação', () => {
  it('nível 7 exige 2 sacrifícios', () => {
    let s = game();
    const a = place(s, 0, 'estagiario');
    const b = place(s, 0, 'estagiario');
    const thy = giveHand(s, 0, 'thy_revisor');
    expect(applyAction(s, 0, { type: 'summon', iid: thy, position: 'atk', tributes: [a] }).ok).toBe(false);
    s = act(s, 0, { type: 'summon', iid: thy, position: 'atk', tributes: [a, b] });
    expect(s.players[0].pros.filter(Boolean)).toHaveLength(1);
    expect(s.players[0].grave).toHaveLength(2);
  });
  it('só uma invocação por turno', () => {
    let s = game();
    const a = giveHand(s, 0, 'estagiario');
    const b = giveHand(s, 0, 'qa');
    s = act(s, 0, { type: 'summon', iid: a, position: 'atk' });
    expect(applyAction(s, 0, { type: 'summon', iid: b, position: 'atk' }).ok).toBe(false);
  });
  it('Vitor busca um Thy no deck', () => {
    let s = game({ deck0: [...filler, 'thy_filosofo'] });
    s.players[0].deck.unshift(
      ...s.players[0].deck.splice(
        s.players[0].deck.findIndex((c) => c.cardId === 'thy_filosofo'),
        1,
      ),
    );
    const v = giveHand(s, 0, 'vitor');
    s = act(s, 0, { type: 'summon', iid: v, position: 'atk' });
    expect(s.players[0].hand.some((c) => c.cardId === 'thy_filosofo')).toBe(true);
  });
});

describe('batalha', () => {
  it('ataque maior destrói e causa a diferença', () => {
    let s = game();
    place(s, 0, 'estagiario', 'atk'); // 900
    const atk = place(s, 1, 'backend_noturno', 'atk'); // 1800
    s = toTurn2Battle(s);
    const target = s.players[0].pros.find(Boolean)!.card.iid;
    s = act(s, 1, { type: 'attack', iid: atk, target });
    expect(s.players[0].lp).toBe(4000 - 900);
    expect(s.players[0].pros.filter(Boolean)).toHaveLength(0);
    expect(s.players[0].stress).toBe(1); // tomou dano: +1 Estresse
  });
  it('ataque direto sem Profissionais no campo', () => {
    let s = game();
    const atk = place(s, 1, 'backend_noturno', 'atk');
    s = toTurn2Battle(s);
    s = act(s, 1, { type: 'attack', iid: atk });
    expect(s.players[0].lp).toBe(2200);
  });
  it('defesa maior devolve dano ao atacante', () => {
    let s = game();
    place(s, 0, 'stackoverflow', 'def'); // DEF 2100
    const atk = place(s, 1, 'backend_noturno', 'atk');
    s = toTurn2Battle(s);
    s = act(s, 1, { type: 'attack', iid: atk, target: s.players[0].pros.find(Boolean)!.card.iid });
    expect(s.players[1].lp).toBe(4000 - 300);
    expect(s.players[0].pros.filter(Boolean)).toHaveLength(1);
  });
  it('Erro 404 destrói atacante direto', () => {
    let s = game();
    setBug(s, 0, 'erro_404');
    const atk = place(s, 1, 'backend_noturno', 'atk');
    s = toTurn2Battle(s);
    s = act(s, 1, { type: 'attack', iid: atk });
    expect(s.players[0].lp).toBe(4000);
    expect(s.players[1].pros.filter(Boolean)).toHaveLength(0);
  });
  it('Kelly nega o primeiro ataque do turno', () => {
    let s = game();
    const k = place(s, 0, 'kelly', 'atk');
    const a = place(s, 1, 'backend_noturno', 'atk');
    const b = place(s, 1, 'backend_noturno', 'atk');
    s = toTurn2Battle(s);
    s = act(s, 1, { type: 'attack', iid: a, target: k });
    expect(s.players[0].lp).toBe(4000);
    s = act(s, 1, { type: 'attack', iid: b, target: k });
    expect(s.players[0].lp).toBe(4000 - 400);
  });
  it('Wisley sobrevive, acumula rancor e desabafa ao destruir', () => {
    let s = game();
    const w = place(s, 0, 'wisley', 'atk'); // 1200
    const a = place(s, 1, 'backend_noturno', 'atk'); // 1800
    s = toTurn2Battle(s);
    s = act(s, 1, { type: 'attack', iid: a, target: w });
    expect(s.players[0].pros.filter(Boolean)).toHaveLength(1);
    expect(s.players[0].lp).toBe(4000);
    expect(s.players[0].pros.find(Boolean)!.atkMod).toBe(500);
    // Turno de Wisley: 1700 de ATK destrói um Estagiário (900) e o oponente ganha +2 de Estresse.
    s = act(s, 1, { type: 'endTurn' });
    place(s, 1, 'estagiario', 'atk');
    s = act(s, 0, { type: 'goBattle' });
    const est = s.players[1].pros.find((p) => p?.card.cardId === 'estagiario')!.card.iid;
    const stressBefore = s.players[1].stress;
    s = act(s, 0, { type: 'attack', iid: w, target: est });
    expect(s.players[1].stress).toBeGreaterThanOrEqual(stressBefore + 2);
  });
  it('Moisés finaliza quem o destruiu', () => {
    let s = game();
    const m = place(s, 0, 'moises', 'atk'); // 2000
    const t = place(s, 1, 'douglas_ataque', 'atk'); // 2700
    s = toTurn2Battle(s);
    s = act(s, 1, { type: 'attack', iid: t, target: m });
    expect(s.players[0].pros.filter(Boolean)).toHaveLength(0);
    expect(s.players[1].pros.filter(Boolean)).toHaveLength(0);
  });
});

describe('efeitos especiais', () => {
  it('Douglas troca de forma ao mudar posição', () => {
    let s = game();
    const d = place(s, 0, 'douglas_ataque', 'atk');
    s = act(s, 0, { type: 'changePosition', iid: d });
    const slot = s.players[0].pros.find(Boolean)!;
    expect(slot.card.cardId).toBe('douglas_defensivo');
    expect(slot.position).toBe('def');
  });
  it('Estresse 7: Profissional de maior nível pede demissão e o Estresse zera', () => {
    let s = game();
    place(s, 0, 'estagiario');
    place(s, 0, 'thy_techlead');
    s.players[0].stress = 5;
    const daily = giveHand(s, 0, 'daily');
    s = act(s, 0, { type: 'activate', iid: daily });
    expect(s.players[0].stress).toBe(0);
    expect(s.players[0].pros.filter(Boolean).map((p) => p!.card.cardId)).toEqual(['estagiario']);
  });
  it('Douglas (Dois Problemas) devolve o Estresse', () => {
    let s = game();
    place(s, 1, 'douglas_problemas');
    const po = giveHand(s, 0, 'po');
    s = act(s, 0, { type: 'summon', iid: po, position: 'atk' });
    expect(s.players[1].stress).toBe(0);
    expect(s.players[0].stress).toBe(2);
  });
  it('Patrícia deixa o oponente Chocado', () => {
    let s = game();
    const p = giveHand(s, 0, 'patricia');
    s = act(s, 0, { type: 'summon', iid: p, position: 'atk' });
    s = act(s, 0, { type: 'endTurn' });
    const cafe = giveHand(s, 1, 'cafe');
    expect(applyAction(s, 1, { type: 'activate', iid: cafe }).ok).toBe(false);
  });
  it('Merge Conflict anula Task', () => {
    let s = game();
    setBug(s, 1, 'merge_conflict');
    const cr = giveHand(s, 0, 'code_review');
    const handBefore = s.players[0].hand.length;
    s = act(s, 0, { type: 'activate', iid: cr });
    expect(s.players[0].hand.length).toBe(handBefore - 1);
    expect(s.players[0].stress).toBe(1);
  });
  it('Gato Gordo dá +300 e irrita o Douglas', () => {
    let s = game();
    place(s, 0, 'douglas_ataque');
    const g = giveHand(s, 0, 'gato_gordo');
    s = act(s, 0, { type: 'activate', iid: g });
    expect(getView(s, 0).players[0].pros.find(Boolean)!.atk).toBe(2700 + 300 + 800);
  });
  it('Deploy na Sexta é determinístico pela seed', () => {
    const run = (seed: number) => {
      let s = game({ seed });
      place(s, 0, 'qa');
      const d = giveHand(s, 0, 'deploy_sexta');
      s = act(s, 0, { type: 'activate', iid: d });
      return [s.players[1].lp, s.players[0].pros.filter(Boolean).length];
    };
    expect(run(7)).toEqual(run(7));
    const results = new Set(Array.from({ length: 20 }, (_, i) => run(i).join()));
    expect(results.size).toBe(2); // sucesso e falha acontecem
  });
});

describe('fim do duelo e referências no log', () => {
  it('desistência registra o motivo e quem perdeu', () => {
    const s = act(game(), 1, { type: 'surrender' });
    expect(s.winner).toBe(0);
    expect(s.outcome).toEqual({ reason: 'surrender', loser: 1 });
    expect(getView(s, 0).outcome).toEqual({ reason: 'surrender', loser: 1 });
  });
  it('LP zerado registra o motivo "lp"', () => {
    let s = game();
    s.players[0].lp = 500;
    const atk = place(s, 1, 'backend_noturno', 'atk');
    s = toTurn2Battle(s);
    s = act(s, 1, { type: 'attack', iid: atk });
    expect(s.outcome).toEqual({ reason: 'lp', loser: 0 });
  });
  it('deck vazio registra o motivo "deckout"', () => {
    let s = game();
    s.players[1].deck = [];
    s = act(s, 0, { type: 'endTurn' });
    expect(s.outcome).toEqual({ reason: 'deckout', loser: 1 });
  });
  it('forfeit encerra por tempo ou abandono sem mexer no estado original', () => {
    const s = game();
    const t = forfeit(s, 0, 'timeout');
    expect(t.outcome).toEqual({ reason: 'timeout', loser: 0 });
    expect(t.winner).toBe(1);
    expect(s.winner).toBeNull();
    expect(forfeit(s, 1, 'abandon').log.at(-2)?.text).toContain('abandonou');
  });
  it('o log do ataque traz atacante e alvo', () => {
    let s = game();
    place(s, 0, 'estagiario', 'atk');
    const atk = place(s, 1, 'backend_noturno', 'atk');
    s = toTurn2Battle(s);
    const target = s.players[0].pros.find(Boolean)!.card.iid;
    s = act(s, 1, { type: 'attack', iid: atk, target });
    const entry = s.log.find((l) => l.kind === 'attack')!;
    expect(entry).toMatchObject({ iid: atk, target });
    expect(s.log.find((l) => l.kind === 'destroy')).toMatchObject({ iid: target });
  });
});

describe('escolha de zona', () => {
  it('invoca e baixa na zona pedida, recusando zona ocupada', () => {
    let s = game();
    place(s, 0, 'estagiario', 'atk', 0);
    const pro = giveHand(s, 0, 'backend_noturno');
    expect(applyAction(s, 0, { type: 'summon', iid: pro, position: 'atk', zone: 0 })).toEqual({
      ok: false,
      error: 'Essa zona está ocupada.',
    });
    expect(applyAction(s, 0, { type: 'summon', iid: pro, position: 'atk', zone: 7 })).toMatchObject({ ok: false });
    s = act(s, 0, { type: 'summon', iid: pro, position: 'atk', zone: 2 });
    expect(s.players[0].pros[2]?.card.iid).toBe(pro);
    const bug = giveHand(s, 0, 'erro_404');
    s = act(s, 0, { type: 'set', iid: bug, zone: 1 });
    expect(s.players[0].spells[1]?.card.iid).toBe(bug);
  });
});

describe('segunda leva: Juju, Diegão, Brunão, Pirulito e Tasks', () => {
  const proView = (s: GameState, seat: Seat, iid: string) => getView(s, seat).players[seat].pros.find((p) => p?.iid === iid)!;

  it('Pirulito deixa os Profissionais do oponente Atordoados (−300 ATK)', () => {
    const s = game();
    place(s, 0, 'pirulito');
    const b = place(s, 1, 'backend_noturno');
    expect(proView(s, 1, b).atk).toBe(1500);
  });
  it('Patada Irônica anula o efeito do alvo e tira 1000 ATK', () => {
    let s = game();
    const k = place(s, 0, 'kelly', 'atk'); // 1400, nega o primeiro ataque
    const d = place(s, 1, 'diegao');
    const b = place(s, 1, 'backend_noturno');
    s = act(s, 0, { type: 'endTurn' });
    s = act(s, 1, { type: 'ignition', iid: d, target: k });
    expect(proView(s, 0, k)).toMatchObject({ atk: 400, negated: true });
    s = act(s, 1, { type: 'goBattle' });
    s = act(s, 1, { type: 'attack', iid: b, target: k });
    expect(s.players[0].pros.filter(Boolean)).toHaveLength(0);
    expect(s.players[0].lp).toBe(4000 - 1400);
    // A Patada é 1x por turno.
    expect(applyAction(s, 1, { type: 'ignition', iid: d, target: k }).ok).toBe(false);
  });
  it('Coração de ouro: Diegão salva um aliado 1x por turno', () => {
    let s = game();
    place(s, 0, 'diegao');
    const e = place(s, 0, 'estagiario'); // 900
    const b1 = place(s, 1, 'backend_noturno');
    const b2 = place(s, 1, 'backend_noturno');
    s = toTurn2Battle(s);
    s = act(s, 1, { type: 'attack', iid: b1, target: e });
    expect(s.players[0].pros.some((p) => p?.card.iid === e)).toBe(true);
    expect(s.players[0].lp).toBe(4000 - 900);
    s = act(s, 1, { type: 'attack', iid: b2, target: e });
    expect(s.players[0].pros.some((p) => p?.card.iid === e)).toBe(false);
  });
  it('CEO: os outros Profissionais seus não são destruídos por efeitos do oponente', () => {
    const s = game();
    const ceo = place(s, 0, 'ceo');
    const e = place(s, 0, 'estagiario');
    expect(destroyPro(s, e, { battle: false, bySeat: 1 })).toBe(false);
    // Efeito do próprio dono e batalha não são barrados; o CEO não protege a si mesmo.
    expect(destroyPro(s, ceo, { battle: false, bySeat: 1 })).toBe(true);
    expect(destroyPro(s, e, { battle: false, bySeat: 1 })).toBe(true);
  });
  it('CEO anulado não protege ninguém', () => {
    let s = game();
    const ceo = place(s, 0, 'ceo');
    const e = place(s, 0, 'estagiario');
    const d = place(s, 1, 'diegao');
    s = act(s, 0, { type: 'endTurn' });
    s = act(s, 1, { type: 'ignition', iid: d, target: ceo });
    expect(destroyPro(s, e, { battle: false, bySeat: 1 })).toBe(true);
  });
  it('Comandar: CEO ganha +100 ATK por Profissional nos seus Desligados', () => {
    const s = game();
    const ceo = place(s, 0, 'ceo');
    expect(proView(s, 0, ceo).atk).toBe(2400);
    s.players[0].grave.push(newInstance(s, 'qa', 0), newInstance(s, 'dev_junior', 0), newInstance(s, 'cafe', 0));
    s.players[1].grave.push(newInstance(s, 'qa', 1));
    expect(proView(s, 0, ceo).atk).toBe(2600);
  });
  it('Isso é meus ovos: anula todos os Profissionais do oponente', () => {
    let s = game();
    const k = place(s, 0, 'kelly');
    const j = place(s, 1, 'juju');
    const b = place(s, 1, 'backend_noturno');
    s = act(s, 0, { type: 'endTurn' });
    s = act(s, 1, { type: 'ignition', iid: j });
    expect(proView(s, 0, k).negated).toBe(true);
    s = act(s, 1, { type: 'goBattle' });
    s = act(s, 1, { type: 'attack', iid: b, target: k });
    expect(s.players[0].pros.filter(Boolean)).toHaveLength(0);
  });
  it('É muito cremoso: −500 DEF, Bugs calados e Brunão não ataca', () => {
    let s = game();
    const sre = place(s, 0, 'sre', 'def'); // DEF 1600
    setBug(s, 0, 'impedimento');
    const br = place(s, 1, 'brunao');
    const b = place(s, 1, 'backend_noturno');
    s = act(s, 0, { type: 'endTurn' });
    s = act(s, 1, { type: 'ignition', iid: br });
    expect(proView(s, 0, sre).def).toBe(1100);
    s = act(s, 1, { type: 'goBattle' });
    expect(proView(s, 1, br).canAttack).toBe(false);
    s = act(s, 1, { type: 'attack', iid: b, target: sre });
    expect(s.players[0].pros.filter(Boolean)).toHaveLength(0);
    expect(s.players[0].spells.some((x) => x?.card.cardId === 'impedimento')).toBe(true);
  });
  it('Juju Sério: −800 DEF em quem está em Defesa e +500 ATK para o Juju', () => {
    let s = game();
    const j = place(s, 0, 'juju');
    const sre = place(s, 1, 'sre', 'def');
    const qa = place(s, 1, 'qa', 'atk');
    s = act(s, 0, { type: 'activate', iid: giveHand(s, 0, 'juju_serio') });
    expect(proView(s, 0, j).atk).toBe(2400);
    expect(proView(s, 1, sre).def).toBe(800);
    expect(proView(s, 1, qa).def).toBe(1400);
  });
  it('Careca Pensante: +500 ATK para todos os carecas, dos dois lados', () => {
    let s = game();
    const c = giveHand(s, 0, 'careca_pensante');
    expect(applyAction(s, 0, { type: 'activate', iid: c }).ok).toBe(false);
    const m = place(s, 0, 'moises');
    const j = place(s, 1, 'juju');
    const q = place(s, 0, 'qa');
    s = act(s, 0, { type: 'activate', iid: c });
    expect(proView(s, 0, m).atk).toBe(2500);
    expect(proView(s, 1, j).atk).toBe(2400);
    expect(proView(s, 0, q).atk).toBe(1600);
  });
  it('A Mão do Moisés: 4+ limpa as zonas do oponente; menos trava um Profissional seu', () => {
    const outcomes = { ok: 0, fail: 0 };
    for (let seed = 1; seed <= 30; seed++) {
      let s = game({ seed });
      const e = place(s, 0, 'estagiario');
      setBug(s, 1, 'impedimento');
      setBug(s, 1, 'erro_404');
      s = act(s, 0, { type: 'activate', iid: giveHand(s, 0, 'mao_moises') });
      const roll = s.log.findLast((l) => l.roll)?.roll;
      expect(roll?.ok).toBe((roll?.face ?? 0) >= 4);
      if (s.players[1].spells.every((x) => !x)) {
        outcomes.ok++;
      } else {
        outcomes.fail++;
        expect(proView(s, 0, e)).toMatchObject({ position: 'def', locked: true, negated: true });
      }
    }
    expect(outcomes.ok).toBeGreaterThan(0);
    expect(outcomes.fail).toBeGreaterThan(0);
  });
});

describe('Sandro Ilusionista', () => {
  it('ao ser invocado manda o oponente para Defesa e custa +4 de Estresse', () => {
    let s = game();
    const a = place(s, 1, 'backend_noturno', 'atk');
    const b = place(s, 1, 'qa', 'atk');
    s = act(s, 0, { type: 'summon', iid: giveHand(s, 0, 'sandro'), position: 'atk' });
    expect(s.players[1].pros.filter(Boolean).map((p) => p!.position)).toEqual(['def', 'def']);
    expect([a, b].every((iid) => s.players[1].pros.some((p) => p?.card.iid === iid))).toBe(true);
    expect(s.players[0].stress).toBe(4);
  });
  it('com Estresse alto a ilusão estoura: o de maior nível pede demissão', () => {
    let s = game();
    place(s, 0, 'thy_techlead');
    s.players[0].stress = 3;
    s = act(s, 0, { type: 'summon', iid: giveHand(s, 0, 'sandro'), position: 'atk' });
    expect(s.players[0].stress).toBe(0);
    expect(s.players[0].pros.filter(Boolean).map((p) => p!.card.cardId)).toEqual(['sandro']);
  });
  it('desgaste: no início do turno os outros de maior nível perdem 100 ATK', () => {
    let s = game();
    place(s, 0, 'sandro');
    const g = place(s, 0, 'gerente'); // nível 5
    const e = place(s, 0, 'estagiario'); // nível 2
    s = act(s, 0, { type: 'endTurn' });
    s = act(s, 1, { type: 'endTurn' });
    const atkMod = (iid: string) => s.players[0].pros.find((p) => p?.card.iid === iid)!.atkMod;
    expect(atkMod(g)).toBe(-100);
    expect(atkMod(e)).toBe(0);
  });
});

describe('FLIP: baixar virado e Invocação-Virar', () => {
  /** Baixa no turno 1 (jogador 0) e passa até o turno 3 (de novo o jogador 0). */
  function setAndWait(cardId: string, s = game()) {
    const iid = giveHand(s, 0, cardId);
    s = act(s, 0, { type: 'set', iid });
    s = act(s, 0, { type: 'endTurn' });
    s = act(s, 1, { type: 'endTurn' });
    return { s, iid };
  }

  it('baixa em Defesa virado, usa a invocação do turno e não dispara oppSummon', () => {
    let s = game();
    setBug(s, 1, 'ia_fez_cagada');
    const iid = giveHand(s, 0, 'qa');
    const other = giveHand(s, 0, 'estagiario');
    s = act(s, 0, { type: 'set', iid });
    const slot = s.players[0].pros.find((p) => p?.card.iid === iid)!;
    expect(slot).toMatchObject({ position: 'def', faceDown: true });
    expect(s.players[1].spells.some(Boolean)).toBe(true); // o Bug não disparou
    expect(applyAction(s, 0, { type: 'summon', iid: other, position: 'atk' }).ok).toBe(false);
    const last = s.log[s.log.length - 1];
    expect(last.cardId).toBeUndefined();
    expect(last.text).not.toContain('QA');
  });

  it('baixar nível 5+ também pede sacrifício', () => {
    let s = game();
    const t = place(s, 0, 'estagiario');
    const g = giveHand(s, 0, 'gerente');
    expect(applyAction(s, 0, { type: 'set', iid: g }).ok).toBe(false);
    s = act(s, 0, { type: 'set', iid: g, tributes: [t] });
    expect(s.players[0].pros.find((p) => p?.card.iid === g)?.faceDown).toBe(true);
  });

  it('a visão esconde o card virado do oponente, mas não do dono', () => {
    let s = game();
    const iid = giveHand(s, 0, 'docker');
    s = act(s, 0, { type: 'set', iid });
    const opp = getView(s, 1).players[0].pros.find((p) => p?.iid === iid)!;
    expect(opp).toMatchObject({ cardId: null, atk: null, def: null, faceDown: true });
    expect(JSON.stringify(getView(s, 1))).not.toContain('docker');
    expect(getView(s, 0).players[0].pros.find((p) => p?.iid === iid)?.cardId).toBe('docker');
  });

  it('Invocação-Virar: não no mesmo turno; depois vira em Ataque e conta como invocação', () => {
    let s = game();
    const iid = giveHand(s, 0, 'sre');
    s = act(s, 0, { type: 'set', iid });
    expect(applyAction(s, 0, { type: 'flipSummon', iid }).ok).toBe(false);
    expect(getView(s, 0).players[0].pros.find((p) => p?.iid === iid)?.canFlip).toBe(false);
    s = act(s, 0, { type: 'endTurn' });
    s = act(s, 1, { type: 'endTurn' });
    setBug(s, 1, 'ia_fez_cagada');
    expect(getView(s, 0).players[0].pros.find((p) => p?.iid === iid)?.canFlip).toBe(true);
    const lp = s.players[0].lp;
    s = act(s, 0, { type: 'flipSummon', iid });
    const slot = s.players[0].pros.find((p) => p?.card.iid === iid)!;
    expect(slot).toMatchObject({ position: 'atk', faceDown: false });
    expect(s.players[0].lp).toBe(lp + 800); // "ao ser invocado" do SRE
    expect(s.players[1].spells.every((x) => !x)).toBe(true); // o Bug de oppSummon disparou
    expect(s.log.some((l) => l.kind === 'flip' && l.iid === iid)).toBe(true);
  });

  it('Invocação-Virar não gasta a invocação normal do turno', () => {
    const { s: s0, iid } = setAndWait('qa');
    let s = s0;
    const other = giveHand(s, 0, 'estagiario');
    s = act(s, 0, { type: 'flipSummon', iid });
    s = act(s, 0, { type: 'summon', iid: other, position: 'atk' });
    expect(s.players[0].pros.filter(Boolean)).toHaveLength(2);
  });

  it('virado não muda de posição nem usa habilidade', () => {
    const { s, iid } = setAndWait('copilot');
    expect(applyAction(s, 0, { type: 'changePosition', iid }).ok).toBe(false);
    expect(applyAction(s, 0, { type: 'ignition', iid, target: iid }).ok).toBe(false);
    expect(getView(s, 0).players[0].pros.find((p) => p?.iid === iid)).toMatchObject({ canChangePos: false, canIgnite: false });
  });

  it('virado tem os efeitos passivos desligados', () => {
    let s = game();
    const iid = giveHand(s, 0, 'gerente');
    const t = place(s, 0, 'estagiario');
    s = act(s, 0, { type: 'set', iid, tributes: [t] });
    s = act(s, 0, { type: 'endTurn' });
    const stress = s.players[1].stress;
    s = act(s, 1, { type: 'endTurn' }); // standby do jogador 0: Gerente virado não cobra status
    expect(s.players[1].stress).toBe(stress);
  });

  it('atacado virado: revela, calcula com o DEF e o card continua para cima', () => {
    let s = game();
    const d = giveHand(s, 0, 'stackoverflow'); // 1000/2100
    s = act(s, 0, { type: 'set', iid: d });
    const q = place(s, 1, 'qa'); // 1600
    s = toTurn2Battle(s);
    const lp = s.players[1].lp;
    s = act(s, 1, { type: 'attack', iid: q, target: d });
    const atkLog = s.log.find((l) => l.kind === 'attack')!;
    expect(atkLog.text).toContain('um Profissional virado');
    expect(s.players[1].lp).toBe(lp - 500);
    expect(s.players[0].pros.find((p) => p?.card.iid === d)).toMatchObject({ faceDown: false, position: 'def' });
  });

  it('Douglas Defensivo virado vira Douglas Ataque na Invocação-Virar', () => {
    let s = game();
    const a = place(s, 0, 'estagiario');
    const b = place(s, 0, 'estagiario');
    const iid = giveHand(s, 0, 'douglas_defensivo');
    s = act(s, 0, { type: 'set', iid, tributes: [a, b] });
    s = act(s, 0, { type: 'endTurn' });
    s = act(s, 1, { type: 'endTurn' });
    s = act(s, 0, { type: 'flipSummon', iid });
    expect(s.players[0].pros.find((p) => p?.card.iid === iid)?.card.cardId).toBe('douglas_ataque');
  });
});

describe('FLIP: efeitos', () => {
  it('atacado virado: o FLIP resolve mesmo se o card for destruído', () => {
    let s = game();
    const so = giveHand(s, 0, 'stackoverflow'); // DEF 2100
    s = act(s, 0, { type: 'set', iid: so });
    const big = place(s, 1, 'cliente'); // 2300
    s = toTurn2Battle(s);
    const hand = s.players[0].hand.length;
    s = act(s, 1, { type: 'attack', iid: big, target: so });
    expect(s.players[0].grave.some((c) => c.iid === so)).toBe(true);
    expect(s.players[0].hand.length).toBe(hand + 1);
    expect(s.log.some((l) => l.text.startsWith('FLIP!'))).toBe(true);
  });

  it('Docker: Invocação-Virar destrói o mais forte do oponente com ATK ≤ 1500', () => {
    let s = game();
    const d = giveHand(s, 0, 'docker');
    s = act(s, 0, { type: 'set', iid: d });
    const weak = place(s, 1, 'estagiario'); // 900
    const mid = place(s, 1, 'sre'); // 800
    const strong = place(s, 1, 'cliente'); // 2300
    s = act(s, 0, { type: 'endTurn' });
    s = act(s, 1, { type: 'endTurn' });
    s = act(s, 0, { type: 'flipSummon', iid: d });
    const left = s.players[1].pros.filter(Boolean).map((p) => p!.card.iid);
    expect(left).toContain(strong);
    expect(left).toContain(mid);
    expect(left).not.toContain(weak);
  });

  it('cards com FLIP mostram a tag no tipo', () => {
    const d = CARD_LIST.find((c) => c.id === 'docker')!;
    expect(fullTypeLine(d)).toBe('Ferramenta / Container / Efeito / FLIP');
  });
});

describe('Tasks Rápidas, Equipamentos, Bug Contínuo e Contra-Bug', () => {
  it('Rápida pode ser ativada na Batalha; Task normal não', () => {
    let s = game();
    const q = place(s, 1, 'qa');
    s = toTurn2Battle(s);
    const z = giveHand(s, 1, 'ctrl_z');
    const cafe = giveHand(s, 1, 'cafe');
    expect(applyAction(s, 1, { type: 'activate', iid: cafe }).ok).toBe(false);
    s = act(s, 1, { type: 'activate', iid: z, target: q });
    expect(s.players[1].pros.find((p) => p?.card.iid === q)!.tempAtk).toBe(800);
  });

  it('Task baixada virada: Rápida só a partir do próximo turno, ativada do campo', () => {
    let s = game();
    const q = place(s, 0, 'qa');
    const z = giveHand(s, 0, 'ctrl_z');
    s = act(s, 0, { type: 'set', iid: z });
    expect(getView(s, 1).players[0].spells.find((x) => x?.iid === z)?.cardId).toBeNull();
    expect(applyAction(s, 0, { type: 'activate', iid: z, target: q }).ok).toBe(false);
    s = act(s, 0, { type: 'endTurn' });
    s = act(s, 1, { type: 'endTurn' });
    expect(getView(s, 0).players[0].spells.find((x) => x?.iid === z)?.canActivate).toBe(true);
    s = act(s, 0, { type: 'activate', iid: z, target: q });
    expect(s.players[0].spells.every((x) => !x)).toBe(true);
    expect(s.players[0].grave.some((c) => c.iid === z)).toBe(true);
  });

  it('Equipamento: soma no equipado e sai junto quando ele sai do campo', () => {
    let s = game();
    const q = place(s, 0, 'qa'); // 1600
    const t = giveHand(s, 0, 'teclado_rgb');
    expect(applyAction(s, 0, { type: 'activate', iid: t }).ok).toBe(false); // alvo obrigatório
    s = act(s, 0, { type: 'activate', iid: t, target: q });
    expect(getView(s, 0).players[0].pros.find((p) => p?.iid === q)?.atk).toBe(2100);
    expect(s.players[0].spells.find((x) => x?.card.iid === t)?.equippedTo).toBe(q);
    const big = place(s, 1, 'thy_techlead');
    s = toTurn2Battle(s);
    s = act(s, 1, { type: 'attack', iid: big, target: q });
    expect(s.players[0].grave.map((c) => c.iid)).toEqual(expect.arrayContaining([q, t]));
    expect(s.players[0].spells.every((x) => !x)).toBe(true);
  });

  it('Fone com Cancelamento de Ruído: +600 DEF e sem Estresse no dano de batalha', () => {
    let s = game();
    const q = place(s, 0, 'qa');
    const f = giveHand(s, 0, 'fone_ruido');
    s = act(s, 0, { type: 'activate', iid: f, target: q });
    const atk = place(s, 1, 'cliente'); // 2300 vs QA 1600 em Ataque
    s = toTurn2Battle(s);
    s = act(s, 1, { type: 'attack', iid: atk, target: q });
    expect(s.players[0].lp).toBe(4000 - 700);
    expect(s.players[0].stress).toBe(0);
  });

  it('Pair Programming: não é destruído e sem dano de batalha neste turno', () => {
    let s = game();
    const q = place(s, 1, 'estagiario');
    const big = place(s, 0, 'cliente', 'atk');
    s = toTurn2Battle(s);
    const pp = giveHand(s, 1, 'pair_programming');
    s = act(s, 1, { type: 'activate', iid: pp, target: q });
    s = act(s, 1, { type: 'attack', iid: q, target: big });
    expect(s.players[1].pros.some((p) => p?.card.iid === q)).toBe(true);
    expect(s.players[1].lp).toBe(4000);
  });

  it('Bug Contínuo fica virado para cima e enfraquece o oponente', () => {
    let s = game();
    setBug(s, 1, 'divida_tecnica');
    const iid = giveHand(s, 0, 'qa');
    s = act(s, 0, { type: 'summon', iid, position: 'atk' });
    const slot = s.players[1].spells.find((x) => x?.card.cardId === 'divida_tecnica');
    expect(slot).toMatchObject({ faceDown: false, revealed: true });
    expect(getView(s, 0).players[0].pros.find((p) => p?.iid === iid)?.atk).toBe(1300);
  });

  it('Contra-Bug anula o Bug do oponente; sem Contra-Bug o Bug resolve', () => {
    let s = game();
    const atk = place(s, 1, 'qa');
    setBug(s, 0, 'impedimento');
    setBug(s, 1, 'revert_pr');
    s = toTurn2Battle(s);
    s = act(s, 1, { type: 'attack', iid: atk });
    expect(s.players[0].lp).toBe(4000 - 1700); // Impedimento anulado: o ataque passou (+100 do Estresse do Revert)
    expect(s.players[0].grave.some((c) => c.cardId === 'impedimento')).toBe(true);
    expect(s.players[1].grave.some((c) => c.cardId === 'revert_pr')).toBe(true);
    expect(s.players[1].stress).toBe(1);
  });
});

describe('Moisés Bombado', () => {
  it('ativado da mão: dobra ATK e DEF do equipado até o fim do turno e é destruído', () => {
    let s = game();
    const q = place(s, 0, 'qa');
    const base = getView(s, 0).players[0].pros.find((p) => p?.iid === q)!;
    const m = giveHand(s, 0, 'moises_bombado');
    s = act(s, 0, { type: 'activate', iid: m, target: q });
    const buffed = getView(s, 0).players[0].pros.find((p) => p?.iid === q)!;
    expect(buffed.atk).toBe(base.atk! * 2);
    expect(buffed.def).toBe(base.def! * 2);
    s = act(s, 0, { type: 'endTurn' });
    expect(s.players[0].spells.every((x) => !x)).toBe(true);
    expect(s.players[0].grave.some((c) => c.iid === m)).toBe(true);
    expect(getView(s, 0).players[0].pros.find((p) => p?.iid === q)?.atk).toBe(base.atk);
  });

  it('baixado virado: ativa sozinho quando o oponente ataca e equipa o atacado', () => {
    let s = game();
    const q = place(s, 0, 'qa'); // 1600 → 3200
    const m = setBug(s, 0, 'moises_bombado');
    const atk = place(s, 1, 'cliente'); // 2300
    s = toTurn2Battle(s);
    s = act(s, 1, { type: 'attack', iid: atk, target: q });
    expect(s.players[1].grave.some((c) => c.iid === atk)).toBe(true);
    expect(s.players[1].lp).toBe(4000 - 900);
    expect(s.players[0].spells.find((x) => x?.card.iid === m)).toMatchObject({ faceDown: false, equippedTo: q });
    s = act(s, 1, { type: 'endTurn' });
    expect(s.players[0].grave.some((c) => c.iid === m)).toBe(true);
  });

  it('não dispara no ataque direto nem no turno em que foi baixado', () => {
    let s = game();
    const m = setBug(s, 0, 'moises_bombado');
    const atk = place(s, 1, 'qa');
    s = toTurn2Battle(s);
    s = act(s, 1, { type: 'attack', iid: atk });
    expect(s.players[0].spells.find((x) => x?.card.iid === m)?.faceDown).toBe(true);
  });
});
