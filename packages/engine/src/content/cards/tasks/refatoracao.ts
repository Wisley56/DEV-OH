import { addStress, defineCard, destroyPro } from '../../../effects/api';
import { needOppPro, targetPro } from '../../helpers';

export default defineCard({
  def: {
    id: 'refatoracao',
    name: 'Refatoração Holística',
    kind: 'task',
    speed: 'normal',
    typeLine: 'Task',
    target: 'oppPro',
    targetRequired: true,
    art: 'icon:🧹|#2b2d42|#8d99ae',
    text: 'Destrua 1 Profissional do oponente. Seu Estresse +2.',
  },
  effects: {
    canActivate: needOppPro,
    onActivate(ctx) {
      const f = targetPro(ctx, 'opp');
      if (f) destroyPro(ctx.s, f.slot.card.iid, { battle: false, bySeat: ctx.me });
      addStress(ctx.s, ctx.me, 2);
    },
  },
});
