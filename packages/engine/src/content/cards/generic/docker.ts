import { addStress, defineCard } from '../../../effects/api';

export default defineCard({
  def: {
    id: 'docker',
    name: 'Docker que Não Sobe',
    kind: 'pro',
    typeLine: 'Ferramenta / Container / Efeito',
    attribute: 'AGUA',
    level: 2,
    atk: 500,
    def: 1800,
    art: 'icon:🐳|#0b3d5c|#2496ed',
    text: 'Na minha máquina sobe: quando destruído, o oponente ganha +1 de Estresse.',
  },
  effects: {
    onDestroyed(ctx) {
      addStress(ctx.s, ctx.opp, 1, true);
    },
  },
});
