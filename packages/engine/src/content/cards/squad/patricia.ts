import { defineCard, log, pname } from '../../../effects/api';

export default defineCard({
  def: {
    id: 'patricia',
    name: 'Patrícia (Tô Passada!)',
    kind: 'pro',
    typeLine: 'Guerreiro / Reação / Efeito',
    attribute: 'LUZ',
    level: 4,
    atk: 1300,
    def: 1500,
    unique: true,
    tags: ['fofoca'],
    art: '/art/patricia.webp',
    text: 'EU TÔ PASSADA, CHOCADA!!!: ao ser invocada, o oponente fica Chocado até o fim do próximo turno dele — não pode ativar Tasks e seus Bugs não disparam.',
    flavor: 'É babado! BOMBA! MDS!',
  },
  effects: {
    onSummon(ctx) {
      // Até o fim do próximo turno do oponente (turno atual + 1).
      ctx.s.players[ctx.opp].shockedUntilTurn = ctx.s.turn + 1;
      log(ctx.s, 'effect', `"EU TÔ PASSADA, CHOCADA!!!" — ${pname(ctx.s, ctx.opp)} ficou Chocado até o fim do próximo turno.`, {
        seat: ctx.me,
        cardId: 'patricia',
      });
    },
  },
});
