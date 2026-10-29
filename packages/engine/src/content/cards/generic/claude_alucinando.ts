import { addStress, defineCard, draw } from '../../../effects/api';

export default defineCard({
  def: {
    id: 'claude_alucinando',
    name: 'Claude Alucinando',
    kind: 'pro',
    rarity: 'rara',
    typeLine: 'IA / Ferramenta',
    attribute: 'LUZ',
    level: 4,
    atk: 1800,
    def: 600,
    tags: ['ia'],
    art: 'icon:🤖|#3b2a8f|#c86bff',
    text: 'Mil linhas por segundo: ao ser invocado, compre 1 card e ganhe +1 de Estresse (alguém vai ter que revisar).',
    flavor: '"Você está absolutamente certo!"',
  },
  effects: {
    onSummon(ctx) {
      draw(ctx.s, ctx.me, 1);
      addStress(ctx.s, ctx.me, 1);
    },
  },
});
