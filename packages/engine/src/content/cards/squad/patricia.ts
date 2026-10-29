import { addStress, defineCard, log, pname, type EffectCtx } from '../../../effects/api';

export default defineCard({
  def: {
    id: 'patricia',
    name: 'Patrícia (Tô Passada!)',
    kind: 'pro',
    rarity: 'rara',
    typeLine: 'Guerreiro / Reação',
    attribute: 'LUZ',
    level: 4,
    atk: 1300,
    def: 1500,
    unique: true,
    tags: ['fofoca'],
    art: '/art/patricia.webp',
    text:
      'EU TÔ PASSADA, CHOCADA!!!: ao ser invocada, o oponente fica Chocado até o fim do próximo turno dele — não pode ativar Tasks e seus Bugs não disparam. ' +
      'FLIP — Chocada em dobro: o oponente ganha +2 de Estresse e fica Chocado.',
    flavor: 'É babado! BOMBA! MDS!',
  },
  effects: {
    onSummon: shock,
    onFlip(ctx) {
      addStress(ctx.s, ctx.opp, 2, true);
      shock(ctx);
    },
  },
});

/** O oponente fica Chocado até o fim do próximo turno dele (turno atual + 1). */
function shock(ctx: EffectCtx) {
  ctx.s.players[ctx.opp].shockedUntilTurn = Math.max(ctx.s.players[ctx.opp].shockedUntilTurn, ctx.s.turn + 1);
  log(ctx.s, 'effect', `"EU TÔ PASSADA, CHOCADA!!!" — ${pname(ctx.s, ctx.opp)} ficou Chocado até o fim do próximo turno.`, {
    seat: ctx.me,
    cardId: 'patricia',
  });
}
