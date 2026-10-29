import { addStress, damage, defineCard } from '../../../effects/api';

export default defineCard({
  def: {
    id: 'prod_caiu',
    name: 'Prod Caiu',
    kind: 'bug',
    trigger: 'proDestroyedByBattle',
    typeLine: 'Bug',
    art: 'icon:🔥|#370617|#ff0a54',
    text: 'Quando um Profissional seu é destruído em batalha: causa 800 de dano ao oponente e ele ganha +2 de Estresse.',
  },
  effects: {
    onTrigger(ctx) {
      damage(ctx.s, ctx.opp, 800, 'Prod Caiu');
      addStress(ctx.s, ctx.opp, 2, true);
    },
  },
});
