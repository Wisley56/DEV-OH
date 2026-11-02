import { createGame, installCustomCards, type CustomCardInput } from '@devoh/engine';
import { afterEach, describe, expect, it } from 'vitest';
import { playCtx } from './cardPlays';
import { dslIgnitionPlay, dslSummonOk, dslTaskPlay } from './dslPlays';

const task = (id: string, effects: CustomCardInput['effects'], extra: Partial<CustomCardInput> = {}): CustomCardInput => ({
  id,
  name: id,
  kind: 'task',
  rarity: 'comum',
  speed: 'normal',
  effects,
  ...extra,
});

function install(inputs: CustomCardInput[]) {
  installCustomCards(inputs.map((input, i) => ({ input, serial: i + 1, artVersion: 1, status: 'published' })));
}

const filler = Array.from({ length: 20 }, (_, i) => (i % 2 ? 'backend_noturno' : 'qa'));
const game = () =>
  createGame({
    players: [
      { name: 'A', deck: filler },
      { name: 'B', deck: filler },
    ],
    seed: 1,
    first: 0,
  });

afterEach(() => {
  installCustomCards([]);
});

describe('plano B do bot para cards do painel', () => {
  it('ativa a Task a favor e segura a que estoura o próprio Estresse', () => {
    install([
      task('x_pressao', [{ when: 'activate', do: [{ do: 'stress', side: 'opp', amount: 2 }] }]),
      task('x_virada', [
        {
          when: 'activate',
          do: [
            { do: 'stress', side: 'me', amount: 3 },
            { do: 'draw', amount: 2 },
          ],
        },
      ]),
    ]);
    const s = game();
    s.players[0].stress = 5;
    const c = playCtx(s, 0);
    expect(dslTaskPlay('x_pressao')!(c)).toEqual({});
    expect(dslTaskPlay('x_virada')!(c)).toBeNull();
    expect(dslTaskPlay('cafe')).toBeUndefined();
  });

  it('mira o Profissional certo no alvo escolhido', () => {
    install([
      task('x_demissao', [{ when: 'activate', do: [{ do: 'destroy', target: 'chosen' }] }], { target: 'oppPro' }),
      {
        id: 'x_mentor',
        name: 'Mentor',
        kind: 'pro',
        rarity: 'rara',
        typeLine: 'Humano / Mentor',
        attribute: 'LUZ',
        level: 4,
        atk: 1500,
        def: 1200,
        target: 'ownPro',
        effects: [{ when: 'ignition', label: 'Mentoria', do: [{ do: 'tempAtk', target: 'chosen', amount: 500 }] }],
      },
    ]);
    const s = game();
    expect(dslTaskPlay('x_demissao')!(playCtx(s, 0))).toBeNull();
    s.players[1].pros[0] = {
      card: { iid: 'alvo', cardId: 'qa', owner: 1 },
      position: 'atk',
      faceDown: false,
      atkMod: 0,
      defMod: 0,
      tempAtk: 0,
      summonedTurn: 0,
      attackedTurn: -5,
      changedPosTurn: -5,
      ignitionTurn: -5,
      lockedUntilTurn: -5,
      oncePerTurn: {},
    };
    expect(dslTaskPlay('x_demissao')!(playCtx(s, 0))).toEqual({ target: 'alvo' });
    expect(dslIgnitionPlay('x_mentor')).toBeDefined();
    expect(dslSummonOk('x_mentor')).toBeUndefined();
  });
});
