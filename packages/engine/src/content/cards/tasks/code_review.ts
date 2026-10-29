import { defineCard, draw } from '../../../effects/api';

export default defineCard({
  def: {
    id: 'code_review',
    name: 'Code Review Aprovado',
    kind: 'task',
    rarity: 'rara',
    speed: 'normal',
    art: 'icon:✅|#1b4332|#74c69d',
    text: 'Compre 2 cards.',
    flavor: 'LGTM 👍 (não leu)',
  },
  effects: {
    onActivate(ctx) {
      draw(ctx.s, ctx.me, 2);
    },
  },
});
