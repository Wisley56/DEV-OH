import { addStress, damage, defineCard, hasFaceUp, log, other } from '../../../effects/api';

export default defineCard({
  def: {
    id: 'douglas_ataque',
    name: 'Douglas (Modo de Ataque)',
    kind: 'pro',
    rarity: 'ultra',
    typeLine: 'Humano / Dev Full Stack',
    attribute: 'FOGO',
    level: 7,
    atk: 2700,
    def: 0,
    unique: true,
    tags: ['douglas'],
    art: '/art/douglas_ataque.webp',
    text:
      'Peteco Peteco: ao atacar, o oponente ganha +1 de Estresse; se destruir um Profissional em batalha, causa +500 de dano. ' +
      'Com "Gato Gordo da Squad" em campo ganha +800 ATK. Ao mudar para Defesa vira "Douglas (Modo Defensivo)".',
    flavor: 'Não fale de "gato gordo" perto dele.',
  },
  effects: {
    atkBonus: (q) => (hasFaceUp(q.s, q.seat, 'gato_gordo') || hasFaceUp(q.s, other(q.seat), 'gato_gordo') ? 800 : 0),
    onAttack(ctx) {
      log(ctx.s, 'effect', '"Peteco Peteco!"', { seat: ctx.me, cardId: 'douglas_ataque' });
      addStress(ctx.s, ctx.opp, 1, true);
    },
    afterBattleKill(ctx) {
      damage(ctx.s, ctx.opp, 500, 'Peteco Peteco');
    },
    onPositionChange: (_ctx, to) => (to === 'def' ? 'douglas_defensivo' : undefined),
  },
});
