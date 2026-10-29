import { addStress, defineCard, draw } from '../../../effects/api';

export default defineCard({
  def: {
    id: 'daily',
    name: 'Daily de 1 Hora',
    kind: 'task',
    speed: 'normal',
    typeLine: 'Task',
    art: 'icon:⏰|#370617|#e85d04',
    text: 'Os dois jogadores ganham +2 de Estresse. Você compra 1 card.',
    flavor: '"Rapidinho, só 15 minutos."',
  },
  effects: {
    onActivate(ctx) {
      addStress(ctx.s, ctx.me, 2);
      addStress(ctx.s, ctx.opp, 2, true);
      draw(ctx.s, ctx.me, 1);
    },
  },
});
