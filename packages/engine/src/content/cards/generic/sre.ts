import { defineCard, heal } from '../../../effects/api';

export default defineCard({
  def: {
    id: 'sre',
    name: 'SRE de Plantão',
    kind: 'pro',
    typeLine: 'Humano / SRE / Efeito',
    attribute: 'AGUA',
    level: 3,
    atk: 800,
    def: 1600,
    art: 'icon:📟|#1b4332|#52b788',
    text: 'Plantão das 3h: ao ser invocado, recupere 800 LP.',
  },
  effects: {
    onSummon(ctx) {
      heal(ctx.s, ctx.me, 800);
    },
  },
});
