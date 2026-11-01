import { afterEach, describe, expect, it } from 'vitest';
import { newInstance, newProSlot } from '../core/board';
import type { Action, CardKind, GameState, Rarity, Seat, TaskSpeed } from '../core/types';
import {
  applyAction,
  card,
  cardList,
  createGame,
  getAtk,
  installCustomCards,
  passivesFor,
  RANGES,
  scoreCard,
  triggersFor,
  validateCustomInput,
  validateDeck,
  type CustomCardInput,
  type EffectAction,
  type EffectPart,
  type PublishedCustomCard,
  type TargetRef,
} from '../index';
import { checkInvariants, prng, randomAction, randomDeck } from '../testing/fuzz';

/** Cards em código simples, transcritos em blocos: devem jogar igual e caber na tabela. */
const TRANSCRIBED: CustomCardInput[] = [
  {
    id: 'x_home_office',
    name: 'Home Office',
    kind: 'task',
    rarity: 'comum',
    speed: 'normal',
    effects: [
      {
        when: 'activate',
        do: [
          { do: 'stress', side: 'me', amount: -2 },
          { do: 'heal', amount: 1000 },
        ],
      },
    ],
  },
  {
    id: 'x_daily',
    name: 'Daily de 1 Hora',
    kind: 'task',
    rarity: 'comum',
    speed: 'normal',
    effects: [
      {
        when: 'activate',
        do: [
          { do: 'stress', side: 'both', amount: 2 },
          { do: 'draw', amount: 1 },
        ],
      },
    ],
  },
  {
    id: 'x_cafe',
    name: 'Café Extra Forte',
    kind: 'task',
    rarity: 'comum',
    speed: 'normal',
    target: 'ownPro',
    effects: [
      {
        when: 'activate',
        do: [
          { do: 'stress', side: 'me', amount: -3 },
          { do: 'tempAtk', target: 'chosen', amount: 500 },
        ],
      },
    ],
  },
  {
    id: 'x_teclado_rgb',
    name: 'Teclado Mecânico RGB',
    kind: 'task',
    rarity: 'comum',
    speed: 'equip',
    target: 'ownPro',
    effects: [{ passive: 'equip', atk: 500, def: 0 }],
  },
  {
    id: 'x_prod_caiu',
    name: 'Prod Caiu',
    kind: 'bug',
    rarity: 'rara',
    trigger: 'proDestroyedByBattle',
    effects: [
      {
        when: 'bug',
        do: [
          { do: 'damage', amount: 800 },
          { do: 'stress', side: 'opp', amount: 2 },
        ],
      },
    ],
  },
  {
    id: 'x_erro_404',
    name: 'Erro 404',
    kind: 'bug',
    rarity: 'rara',
    trigger: 'oppDirectAttack',
    effects: [{ when: 'bug', do: [{ do: 'negateEvent' }, { do: 'destroy', target: 'event' }] }],
  },
  {
    id: 'x_po',
    name: 'PO do Botãozinho',
    kind: 'pro',
    rarity: 'comum',
    typeLine: 'Humano / PO',
    attribute: 'FOGO',
    level: 4,
    atk: 1700,
    def: 1000,
    effects: [{ when: 'summon', do: [{ do: 'stress', side: 'opp', amount: 2 }] }],
  },
  {
    id: 'x_qa',
    name: 'QA Implacável',
    kind: 'pro',
    rarity: 'comum',
    typeLine: 'Humano / QA',
    attribute: 'LUZ',
    level: 4,
    atk: 1600,
    def: 1400,
    effects: [
      { when: 'battleKill', do: [{ do: 'stress', side: 'opp', amount: 1 }] },
      { when: 'flip', do: [{ do: 'destroySet' }] },
    ],
  },
  {
    id: 'x_dev_junior',
    name: 'Dev Júnior',
    kind: 'pro',
    rarity: 'comum',
    typeLine: 'Humano / Dev',
    attribute: 'LUZ',
    level: 3,
    atk: 1500,
    def: 1100,
    lore: 'Primeiro emprego.',
  },
];

const records = (inputs: CustomCardInput[]): PublishedCustomCard[] =>
  inputs.map((input, i) => ({ input, serial: i + 1, artVersion: 1, status: 'published' }));

afterEach(() => {
  installCustomCards([]);
});

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

function give(s: GameState, seat: Seat, cardId: string) {
  const c = newInstance(s, cardId, seat);
  s.players[seat].hand.push(c);
  return c.iid;
}

function setSpell(s: GameState, seat: Seat, cardId: string) {
  const c = newInstance(s, cardId, seat);
  s.players[seat].spells[s.players[seat].spells.findIndex((x) => !x)] = { card: c, faceDown: true, revealed: false, setTurn: -5 };
}

/** O que importa comparar: LP, Estresse, mão, cemitério e o campo (ATK de cada Profissional). */
function snapshot(s: GameState) {
  return s.players.map((p, seat) => ({
    lp: p.lp,
    stress: p.stress,
    hand: p.hand.length,
    grave: p.grave.length,
    pros: p.pros.map((x) => x && { atk: getAtk(s, seat as Seat, x), pos: x.position }),
  }));
}

/** Roda o mesmo cenário com o card em código e com o transcrito. */
function same(scenario: (id: string) => GameState, code: string) {
  installCustomCards(records(TRANSCRIBED));
  expect(snapshot(scenario(`x_${code}`))).toEqual(snapshot(scenario(code)));
}

describe('blocos de efeito: equivalência com os cards em código', () => {
  it('Tasks normais (Home Office, Daily, Café com alvo)', () => {
    for (const id of ['home_office', 'daily']) {
      same((c) => {
        const s = game();
        s.players[0].stress = 4;
        s.players[0].lp = 3000;
        return act(s, 0, { type: 'activate', iid: give(s, 0, c) });
      }, id);
    }
    same((c) => {
      const s = game();
      s.players[0].stress = 4;
      const pro = place(s, 0, 'backend_noturno');
      return act(s, 0, { type: 'activate', iid: give(s, 0, c), target: pro });
    }, 'cafe');
  });

  it('Equipamento (Teclado RGB)', () => {
    same((c) => {
      const s = game();
      const pro = place(s, 0, 'backend_noturno');
      return act(s, 0, { type: 'activate', iid: give(s, 0, c), target: pro });
    }, 'teclado_rgb');
  });

  it('Profissional com efeito ao ser invocado (PO)', () => {
    same((c) => {
      const s = game();
      return act(s, 0, { type: 'summon', iid: give(s, 0, c), position: 'atk' });
    }, 'po');
  });

  it('Bugs (Prod Caiu e Erro 404)', () => {
    same((c) => {
      let s = game();
      place(s, 0, 'dev_junior', 'atk');
      setSpell(s, 0, c);
      const attacker = place(s, 1, 'qa', 'atk');
      s = act(s, 0, { type: 'endTurn' });
      s = act(s, 1, { type: 'goBattle' });
      const target = s.players[0].pros.find(Boolean)!.card.iid;
      return act(s, 1, { type: 'attack', iid: attacker, target });
    }, 'prod_caiu');
    same((c) => {
      let s = game();
      setSpell(s, 0, c);
      const attacker = place(s, 1, 'qa', 'atk');
      s = act(s, 0, { type: 'endTurn' });
      s = act(s, 1, { type: 'goBattle' });
      return act(s, 1, { type: 'attack', iid: attacker });
    }, 'erro_404');
  });

  it('o texto gerado bate com o dos cards em código', () => {
    installCustomCards(records(TRANSCRIBED));
    expect(card('x_home_office').text).toBe(card('home_office').text);
    expect(card('x_daily').text).toBe('Os dois jogadores ganham +2 de Estresse e você compra 1 card.');
    expect(card('x_cafe').text).toBe('Seu Estresse −3 e o alvo (1 Profissional seu) ganha 500 ATK até o fim do turno.');
    expect(card('x_teclado_rgb').text).toBe('Equipamento: o Profissional equipado ganha +500 ATK.');
    expect(card('x_prod_caiu').text).toBe(
      'Quando um Profissional seu é destruído em batalha: causa 800 de dano ao oponente e o oponente ganha +2 de Estresse.',
    );
    expect(card('x_erro_404').text).toBe('Quando o oponente declara um ataque direto: anula o ataque e destrói o atacante.');
    expect(card('x_qa').text).toBe(
      'Quando destrói um Profissional em batalha: o oponente ganha +1 de Estresse. FLIP: destrói 1 Task/Bug virado aleatório do oponente.',
    );
    expect(card('x_dev_junior').text).toBe('Primeiro emprego.');
  });
});

describe('tabela de balanceamento', () => {
  it('os cards transcritos cabem no orçamento (folga de 1 ponto)', () => {
    for (const input of TRANSCRIBED) {
      expect(validateCustomInput(input), input.id).toEqual([]);
      const s = scoreCard(input);
      expect(s.used, `${input.id}: ${s.used} de ${s.budget}`).toBeLessThanOrEqual(s.budget + 1);
    }
  });

  it('Profissional acima do orçamento não passa e ganha sugestões que cabem', () => {
    const forte: CustomCardInput = { ...TRANSCRIBED[6], id: 'x_forte', atk: 2400, def: 1500 };
    const s = scoreCard(forte);
    expect(s.ok).toBe(false);
    expect(s.problems.join(' ')).toMatch(/teto de 1900/);
    expect(s.suggestions.length).toBeGreaterThan(0);
    for (const sug of s.suggestions) expect(scoreCard({ ...forte, ...sug.patch }).ok, sug.label).toBe(true);
  });

  it('Normal ganha 10% e o efeito gasta a verba da raridade', () => {
    const normal = scoreCard(TRANSCRIBED[8]);
    expect(normal.budget).toBeCloseTo(28.6);
    const po = scoreCard(TRANSCRIBED[6]);
    expect(po.budget).toBe(36);
    expect(po.used).toBe(30);
  });
});

/** Efeito aleatório válido para o fuzz. */
function randomPart(rand: () => number, kind: CardKind, speed: TaskSpeed | undefined, trigger: string | undefined): EffectPart {
  const pick = <T>(xs: readonly T[]) => xs[Math.floor(rand() * xs.length)];
  const n = (r: { min: number; max: number; step: number }) => r.min + r.step * Math.floor(rand() * ((r.max - r.min) / r.step + 1));
  const passives = passivesFor(kind, speed);
  if (passives.length && rand() < 0.3) {
    const p = pick(passives);
    if (p === 'equip') return { passive: 'equip', atk: 500, def: n(RANGES.equip) };
    if (p === 'aura')
      return kind === 'pro' || rand() < 0.5
        ? { passive: 'aura', side: 'opp', atk: -300, def: -300 }
        : { passive: 'aura', side: 'me', atk: 300, def: 0 };
    if (p === 'selfAtk') return { passive: 'selfAtk', amount: n(RANGES.selfAtk) };
    return { passive: p };
  }
  const when = pick(triggersFor(kind, speed));
  const targets: TargetRef[] = [
    'strongestOpp',
    'weakestOpp',
    'randomOpp',
    'strongestMine',
    'weakestMine',
    ...(kind === 'pro' ? (['self'] as const) : []),
  ];
  const t = pick(targets);
  const actions: EffectAction[] = [
    { do: 'damage', amount: n(RANGES.damage) },
    { do: 'heal', amount: n(RANGES.heal) },
    { do: 'stress', side: pick(['me', 'opp', 'both'] as const), amount: pick([-2, -1, 1, 2]) },
    { do: 'draw', amount: 1 },
    { do: 'search', kind: pick(['pro', 'task', 'bug'] as const) },
    { do: 'tempAtk', target: t, amount: 500 },
    { do: 'modStats', target: t, atk: -300, def: 200 },
    { do: 'destroy', target: t },
    { do: 'bounce', target: t },
    { do: 'position', target: t },
    { do: 'negate', target: t },
    { do: 'destroySet' },
    { do: 'revealSets' },
    ...(kind === 'bug' && ['oppAttack', 'oppDirectAttack', 'oppTask', 'oppBug', 'battleDamage'].includes(trigger ?? '')
      ? [{ do: 'negateEvent' } as const]
      : []),
  ];
  return {
    when,
    ...(when === 'ignition' && { label: 'Teste' }),
    ...(rand() < 0.3 && {
      if: [pick([{ if: 'chance', pct: 50 }, { if: 'oppHasPros' }, { if: 'stressAtLeast', side: 'me', n: 2 }] as const)],
    }),
    do: [pick(actions), ...(rand() < 0.5 ? [pick(actions)] : [])],
  };
}

function randomCustom(rand: () => number, i: number): CustomCardInput | null {
  const kind = (['pro', 'task', 'bug'] as const)[i % 3];
  const speed = kind === 'task' ? (['normal', 'continuous', 'field', 'quick', 'equip'] as const)[Math.floor(rand() * 5)] : undefined;
  const trigger =
    kind === 'bug'
      ? (['oppSummon', 'oppAttack', 'oppDirectAttack', 'oppTask', 'battleDamage', 'proDestroyedByBattle'] as const)[Math.floor(rand() * 6)]
      : undefined;
  const effects: EffectPart[] = [];
  for (let k = 0; k < 1 + Math.floor(rand() * 3); k++) effects.push(randomPart(rand, kind, speed, trigger));
  const input: CustomCardInput = {
    id: `x_fuzz_${i}`,
    name: `Fuzz ${i}`,
    kind,
    rarity: 'comum' as Rarity,
    ...(kind === 'pro' && { typeLine: 'Teste', attribute: 'TECH', level: 1 + Math.floor(rand() * 4), atk: 1000, def: 1000 }),
    ...(speed && { speed }),
    ...(speed === 'equip' && { target: 'ownPro' }),
    ...(trigger && { trigger }),
    effects:
      speed === 'equip' ? [{ passive: 'equip' as const, atk: 300, def: 0 }, ...effects.filter((p) => 'when' in p)].slice(0, 3) : effects,
  };
  return validateCustomInput(input).length ? null : input;
}

describe('fuzz dos blocos', () => {
  it('cards do painel aleatórios jogam milhares de jogadas sem exceção nem corrupção', () => {
    const rand = prng(4242);
    const inputs: CustomCardInput[] = [];
    for (let i = 0; inputs.length < 30 && i < 400; i++) {
      const c = randomCustom(rand, i);
      if (c) inputs.push(c);
    }
    expect(inputs.length).toBe(30);
    const r = installCustomCards(records(inputs));
    expect(r.rejected).toEqual([]);
    const custom = cardList().filter((c) => c.id.startsWith('x_'));

    let applied = 0;
    for (let g = 0; g < 30; g++) {
      const gr = prng(77 + g);
      // Metade dos cards do deck vem do painel.
      const decks = [0, 1].map(() => [...randomDeck(gr).slice(0, 12), ...randomDeck(gr, custom).slice(0, 12)]);
      decks.forEach((d) => expect(validateDeck(d)).toEqual([]));
      let s = createGame({
        players: [
          { name: 'A', deck: decks[0] },
          { name: 'B', deck: decks[1] },
        ],
        seed: g,
        first: (g % 2) as Seat,
      });
      for (let step = 0; step < 400 && s.winner === null; step++) {
        const seat: Seat = gr() < 0.85 ? s.active : ((1 - s.active) as Seat);
        const before = JSON.stringify(s);
        const res = applyAction(s, seat, randomAction(s, gr));
        expect(JSON.stringify(s), 'applyAction alterou o estado recebido').toBe(before);
        if (!res.ok) continue;
        applied++;
        s = res.state;
        checkInvariants(s);
      }
    }
    expect(applied).toBeGreaterThan(1000);
  }, 60_000);
});
