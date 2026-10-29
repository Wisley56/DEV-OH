import { defineCard, draw } from '../../../effects/api';

export default defineCard({
  def: {
    id: 'code_review',
    name: 'Code Review Aprovado',
    kind: 'task',
    speed: 'normal',
    typeLine: 'Task',
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
