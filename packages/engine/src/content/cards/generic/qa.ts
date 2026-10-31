import { addStress, defineCard, destroySpell, log, randInt, setCardsOf } from '../../../effects/api';

export default defineCard({
  def: {
    id: 'qa',
    name: 'QA Implacável',
    kind: 'pro',
    rarity: 'comum',
    typeLine: 'Humano / QA',
    attribute: 'LUZ',
    level: 4,
    atk: 1600,
    def: 1400,
    art: '/art/qa.webp',
    text:
      'Reabriu o ticket: quando destrói um Profissional em batalha, o oponente ganha +1 de Estresse. ' +
      'FLIP — Achei um bug!: destrói 1 Task/Bug virado aleatório do oponente.',
  },
  effects: {
    afterBattleKill(ctx) {
      addStress(ctx.s, ctx.opp, 1, true);
    },
    onFlip(ctx) {
      const sets = setCardsOf(ctx.s, ctx.opp);
      log(ctx.s, 'effect', sets.length ? 'QA: "Achei um bug!"' : 'QA: "Achei um bug!"… era feature.', { seat: ctx.me, cardId: 'qa' });
      if (sets.length) destroySpell(ctx.s, sets[randInt(ctx.s, sets.length)].card.iid);
    },
  },
});
