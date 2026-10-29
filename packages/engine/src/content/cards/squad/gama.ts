import { addStress, defineCard, destroySpell, log, proOnField, randInt, setCardsOf } from '../../../effects/api';

export default defineCard({
  def: {
    id: 'gama',
    name: 'Gama (Tô Passado!)',
    kind: 'pro',
    typeLine: 'Guerreiro / Fofoca / Efeito',
    attribute: 'LUZ',
    level: 4,
    atk: 1500,
    def: 1300,
    unique: true,
    tags: ['fofoca'],
    art: '/art/gama.webp',
    text: 'Babado forte!: ao ser invocado, destrói 1 card virado aleatório do oponente. Se "Patrícia" estiver no seu campo, o oponente também ganha +2 de Estresse.',
    flavor: '"EU TÔ PASSADA, CHOCADA!!!"',
  },
  effects: {
    onSummon(ctx) {
      const sets = setCardsOf(ctx.s, ctx.opp);
      if (sets.length) {
        const pick = sets[randInt(ctx.s, sets.length)];
        log(ctx.s, 'effect', 'Gama: "Babado forte!" — vazou um card do oponente.', { seat: ctx.me, cardId: 'gama' });
        destroySpell(ctx.s, pick.card.iid);
      }
      if (proOnField(ctx.s, ctx.me, 'patricia')) {
        log(ctx.s, 'effect', 'Patrícia e Gama juntos: a fofoca virou BOMBA!', { seat: ctx.me });
        addStress(ctx.s, ctx.opp, 2, true);
      }
    },
  },
});
