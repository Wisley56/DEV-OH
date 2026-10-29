import { addStress, defineCard, setPosition } from '../../../effects/api';
import { targetPro } from '../../helpers';

export default defineCard({
  def: {
    id: 'reuniao',
    name: 'Reunião que Podia Ser um E-mail',
    kind: 'task',
    speed: 'normal',
    typeLine: 'Task',
    target: 'oppPro',
    art: 'icon:📅|#40164a|#e07a5f',
    text: 'O oponente ganha +2 de Estresse. Se você escolher um Profissional do oponente, ele vai para Defesa.',
  },
  effects: {
    onActivate(ctx) {
      addStress(ctx.s, ctx.opp, 2, true);
      const f = targetPro(ctx, 'opp');
      if (f) setPosition(ctx.s, f.slot.card.iid, 'def');
    },
  },
});
