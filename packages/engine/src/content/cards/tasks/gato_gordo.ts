import { addStress, defineCard, log } from '../../../effects/api';

export default defineCard({
  def: {
    id: 'gato_gordo',
    name: 'Contemplai… o Gato Gordo da Squad!',
    kind: 'task',
    rarity: 'super',
    speed: 'field',
    art: '/art/gato_gordo.webp',
    text: 'Seus Profissionais ganham +300 ATK. "Douglas (Modo de Ataque)" fica irritado e ganha +800. No início do seu turno, o gato ronrona: seu Estresse −1.',
    flavor: 'O verdadeiro dono da squad.',
  },
  effects: {
    onStandby(ctx) {
      if (ctx.s.players[ctx.me].stress > 0) {
        log(ctx.s, 'effect', 'O Gato Gordo ronronou. Todo mundo relaxou um pouco.', { seat: ctx.me, cardId: 'gato_gordo' });
        addStress(ctx.s, ctx.me, -1);
      }
    },
    auraAtk: () => 300,
  },
});
