import { addStress, defineCard } from '../../../effects/api';

export default defineCard({
  def: {
    id: 'revert_pr',
    name: 'Revert do PR',
    kind: 'bug',
    rarity: 'super',
    bugType: 'counter',
    trigger: 'oppBug',
    art: 'icon:⏪|#2b2d42|#ef233c',
    text: 'Contra-Bug: quando um Bug do oponente dispara, ele é anulado e destruído. Seu Estresse +1.',
    flavor: 'git revert HEAD — e finge que nada aconteceu.',
  },
  effects: {
    onTrigger(ctx, ev) {
      ev.negated = true;
      addStress(ctx.s, ctx.me, 1);
    },
  },
});
