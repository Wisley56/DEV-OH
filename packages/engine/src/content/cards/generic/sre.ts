import { bounceToHand, defineCard, getAtk, heal, log, prosOf } from '../../../effects/api';

export default defineCard({
  def: {
    id: 'sre',
    name: 'SRE de Plantão',
    kind: 'pro',
    rarity: 'comum',
    typeLine: 'Humano / SRE',
    attribute: 'AGUA',
    level: 3,
    atk: 800,
    def: 1600,
    art: '/art/sre.webp',
    text: 'Plantão das 3h: ao ser invocado, recupere 800 LP. FLIP — Rollback: o Profissional mais forte do oponente volta para a mão do dono.',
  },
  effects: {
    onSummon(ctx) {
      heal(ctx.s, ctx.me, 800);
    },
    onFlip(ctx) {
      const t = prosOf(ctx.s, ctx.opp).sort((a, b) => getAtk(ctx.s, ctx.opp, b) - getAtk(ctx.s, ctx.opp, a))[0];
      if (!t) return;
      log(ctx.s, 'effect', 'Rollback! A última versão do oponente foi desfeita.', { seat: ctx.me, cardId: 'sre' });
      bounceToHand(ctx.s, t.card.iid);
    },
  },
});
