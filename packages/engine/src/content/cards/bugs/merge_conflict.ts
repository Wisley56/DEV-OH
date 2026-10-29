import { addStress, defineCard } from '../../../effects/api';

export default defineCard({
  def: {
    id: 'merge_conflict',
    name: 'Merge Conflict',
    kind: 'bug',
    trigger: 'oppTask',
    typeLine: 'Bug',
    art: 'icon:⚔️|#4a0e4e|#e36414',
    text: 'Quando o oponente ativa uma Task: ela é anulada e destruída. Os dois jogadores ganham +1 de Estresse.',
  },
  effects: {
    onTrigger(ctx, ev) {
      ev.negated = true;
      addStress(ctx.s, ctx.me, 1);
      addStress(ctx.s, ctx.opp, 1, true);
    },
  },
});
