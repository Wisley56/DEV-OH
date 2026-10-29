import { bounceToHand, defineCard } from '../../../effects/api';

export default defineCard({
  def: {
    id: 'mudanca_escopo',
    name: 'Mudança de Escopo',
    kind: 'bug',
    trigger: 'oppAttack',
    typeLine: 'Bug',
    art: 'icon:📐|#283618|#dda15e',
    text: 'Quando um Profissional do oponente declara ataque: ele volta para a mão do dono.',
  },
  effects: {
    onTrigger(ctx, ev) {
      ev.negated = true;
      if (ev.attacker) bounceToHand(ctx.s, ev.attacker);
    },
  },
});
