import { addStress, defineCard, log, nameOf } from '../../../effects/api';
import { targetPro } from '../../helpers';

export default defineCard({
  def: {
    id: 'cafe',
    name: 'Café Extra Forte',
    kind: 'task',
    speed: 'normal',
    typeLine: 'Task',
    target: 'ownPro',
    art: 'icon:☕|#3e1f0d|#c68b59',
    text: 'Seu Estresse −3. Se você escolher um Profissional seu, ele ganha +500 ATK até o fim do turno.',
  },
  effects: {
    onActivate(ctx) {
      addStress(ctx.s, ctx.me, -3);
      const f = targetPro(ctx, 'me');
      if (f) {
        f.slot.tempAtk += 500;
        log(ctx.s, 'effect', `"${nameOf(f.slot.card)}" tomou o café: +500 ATK.`, { seat: ctx.me });
      }
    },
  },
});
