import { bounceToHand, defineCard } from '../../../effects/api';
import { targetPro } from '../../helpers';

export default defineCard({
  def: {
    id: 'cliente',
    name: 'Cliente que Mudou de Ideia',
    kind: 'pro',
    typeLine: 'Humano / Cliente / Efeito',
    attribute: 'TREVA',
    level: 6,
    atk: 2300,
    def: 1900,
    target: 'oppPro',
    art: 'icon:🔄|#3d0c45|#b5179e',
    text: 'Na verdade eu queria…: ao ser invocado, devolva 1 Profissional do oponente para a mão do dono.',
  },
  effects: {
    onSummon(ctx) {
      const f = targetPro(ctx, 'opp');
      if (f) bounceToHand(ctx.s, f.slot.card.iid);
    },
  },
});
