import { addStress, defineCard } from '../../../effects/api';

export default defineCard({
  def: {
    id: 'estagiario',
    name: 'Estagiário Entusiasmado',
    kind: 'pro',
    typeLine: 'Humano / Estagiário / Efeito',
    attribute: 'LUZ',
    level: 2,
    atk: 900,
    def: 500,
    art: 'icon:🧑‍🎓|#2d6a4f|#95d5b2',
    text: 'Trouxe café pra todo mundo: ao ser invocado, seu Estresse −1.',
    flavor: '"Posso pegar uma task?"',
  },
  effects: {
    onSummon(ctx) {
      addStress(ctx.s, ctx.me, -1);
    },
  },
});
