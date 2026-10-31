import { addStress, defineCard, destroyPro, getAtk, log, prosOf } from '../../../effects/api';

export default defineCard({
  def: {
    id: 'docker',
    name: 'Docker que Não Sobe',
    kind: 'pro',
    rarity: 'comum',
    typeLine: 'Ferramenta / Container',
    attribute: 'AGUA',
    level: 2,
    atk: 500,
    def: 1400,
    art: '/art/docker.webp',
    text:
      'Na minha máquina sobe: quando destruído, o oponente ganha +1 de Estresse. ' +
      'FLIP — Container isolado: destrói o Profissional mais forte do oponente com ATK ≤ 1500.',
  },
  effects: {
    onDestroyed(ctx) {
      addStress(ctx.s, ctx.opp, 1, true);
    },
    onFlip(ctx) {
      const t = prosOf(ctx.s, ctx.opp)
        .filter((p) => getAtk(ctx.s, ctx.opp, p) <= 1500)
        .sort((a, b) => getAtk(ctx.s, ctx.opp, b) - getAtk(ctx.s, ctx.opp, a))[0];
      if (!t) return log(ctx.s, 'effect', 'Container isolado… mas não tinha ninguém para isolar.', { seat: ctx.me, cardId: 'docker' });
      log(ctx.s, 'effect', 'Container isolado: subiu numa rede só dele.', { seat: ctx.me, cardId: 'docker' });
      destroyPro(ctx.s, t.card.iid, { battle: false, bySeat: ctx.me });
    },
  },
});
