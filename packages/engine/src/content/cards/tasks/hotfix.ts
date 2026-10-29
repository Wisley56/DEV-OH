import { defineCard, destroySpell, findSpell, setCardsOf } from '../../../effects/api';

export default defineCard({
  def: {
    id: 'hotfix',
    name: 'Hotfix',
    kind: 'task',
    rarity: 'comum',
    speed: 'normal',
    target: 'oppSet',
    targetRequired: true,
    art: 'icon:🩹|#6a040f|#f48c06',
    text: 'Destrua 1 card virado do oponente.',
  },
  effects: {
    canActivate: (ctx) => (setCardsOf(ctx.s, ctx.opp).length ? null : 'O oponente não tem cards virados.'),
    onActivate(ctx) {
      const f = findSpell(ctx.s, ctx.target);
      if (f && f.seat === ctx.opp && f.slot.faceDown) destroySpell(ctx.s, f.slot.card.iid);
    },
  },
});
