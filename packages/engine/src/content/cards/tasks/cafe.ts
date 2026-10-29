import { addStress, defineCard, log, proLabel } from '../../../effects/api';
import { targetPro } from '../../helpers';

export default defineCard({
  def: {
    id: 'cafe',
    name: 'Café Extra Forte',
    kind: 'task',
    rarity: 'comum',
    speed: 'normal',
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
        log(ctx.s, 'effect', `${proLabel(f.slot)} tomou o café: +500 ATK.`, { seat: ctx.me });
      }
    },
  },
});
