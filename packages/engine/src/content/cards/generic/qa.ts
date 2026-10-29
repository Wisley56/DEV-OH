import { addStress, defineCard } from '../../../effects/api';

export default defineCard({
  def: {
    id: 'qa',
    name: 'QA Implacável',
    kind: 'pro',
    typeLine: 'Humano / QA / Efeito',
    attribute: 'LUZ',
    level: 4,
    atk: 1600,
    def: 1400,
    art: 'icon:🔍|#03045e|#00b4d8',
    text: 'Reabriu o ticket: quando destrói um Profissional em batalha, o oponente ganha +1 de Estresse.',
  },
  effects: {
    afterBattleKill(ctx) {
      addStress(ctx.s, ctx.opp, 1, true);
    },
  },
});
