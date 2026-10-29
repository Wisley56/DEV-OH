import { defineCard, findPro, log, prosOf, setCardsOf } from '../../../effects/api';

export default defineCard({
  def: {
    id: 'brunao',
    name: 'Brunão',
    kind: 'pro',
    typeLine: 'Guerreiro / Especialista / Efeito',
    attribute: 'TREVA',
    level: 5,
    atk: 2100,
    def: 1500,
    unique: true,
    art: '/art/brunao.webp',
    text:
      'É muito cremoso (1x por turno): todos os Profissionais do oponente perdem 500 DEF e os Bugs dele não disparam até o fim do turno — ' +
      'suas ideias passam sem contestação. Brunão fica negociando e não ataca neste turno.',
    flavor: '"É muito cremoso."',
    ignition: { label: 'É muito cremoso' },
  },
  effects: {
    canIgnite: (ctx) =>
      prosOf(ctx.s, ctx.opp).length || setCardsOf(ctx.s, ctx.opp).length ? null : 'Não tem ninguém do outro lado para convencer.',
    onIgnite(ctx) {
      log(ctx.s, 'effect', 'Brunão: "É muito cremoso…" — o outro lado amansou (−500 DEF, Bugs calados neste turno).', {
        seat: ctx.me,
        cardId: 'brunao',
      });
      for (const p of prosOf(ctx.s, ctx.opp)) p.defMod -= 500;
      const opp = ctx.s.players[ctx.opp];
      opp.shockedUntilTurn = Math.max(opp.shockedUntilTurn, ctx.s.turn);
      const f = findPro(ctx.s, ctx.self.iid);
      if (f) f.slot.attackedTurn = ctx.s.turn;
    },
  },
});
