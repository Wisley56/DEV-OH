import { addStress, defineCard, log } from '../../../effects/api';

export default defineCard({
  def: {
    id: 'douglas_calma',
    name: 'Douglas (No Limite)',
    kind: 'pro',
    typeLine: 'Guerreiro / Berserker / Efeito',
    attribute: 'FOGO',
    level: 5,
    atk: 1900,
    def: 1500,
    unique: true,
    tags: ['douglas'],
    art: '/art/douglas_calma.webp',
    text: 'CALMA… RESPIRA… NÃO INFARTA!: ganha +200 ATK extra por ponto do seu Estresse. Ao ser invocado, seu Estresse +1.',
    flavor: 'Sempre a um passo de explodir.',
  },
  effects: {
    onSummon(ctx) {
      log(ctx.s, 'effect', 'Douglas: "CALMA… RESPIRA… NÃO INFARTA!"', { seat: ctx.me, cardId: 'douglas_calma' });
      addStress(ctx.s, ctx.me, 1);
    },
    atkBonus: (q) => q.s.players[q.seat].stress * 200,
  },
});
