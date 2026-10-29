import { defineCard, log } from '../../../effects/api';

export default defineCard({
  def: {
    id: 'divida_tecnica',
    name: 'Dívida Técnica',
    kind: 'bug',
    rarity: 'rara',
    bugType: 'continuous',
    trigger: 'oppSummon',
    art: 'icon:💸|#3d0000|#c1121f',
    text: 'Contínuo: dispara quando o oponente invoca um Profissional e fica no campo virado para cima. Enquanto estiver no campo, os Profissionais do oponente perdem 300 ATK.',
    flavor: 'A gente arruma depois. (Ninguém nunca arrumou.)',
  },
  effects: {
    onTrigger(ctx) {
      log(ctx.s, 'effect', 'Dívida Técnica: os juros chegaram — Profissionais do oponente −300 ATK.', {
        seat: ctx.me,
        cardId: 'divida_tecnica',
      });
    },
    oppAura: () => ({ atk: -300 }),
  },
});
