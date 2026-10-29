import { defineCard, log, prosOf } from '../../../effects/api';

export default defineCard({
  def: {
    id: 'impedimento',
    name: 'Impedimento de Última Hora',
    kind: 'bug',
    rarity: 'comum',
    trigger: 'oppAttack',
    art: 'icon:⛔|#590d22|#ff4d6d',
    text: 'Quando um Profissional do oponente declara ataque: o ataque é negado e a Batalha do oponente termina.',
  },
  effects: {
    onTrigger(ctx, ev) {
      ev.negated = true;
      for (const p of prosOf(ctx.s, ctx.opp)) p.attackedTurn = ctx.s.turn;
      log(ctx.s, 'effect', 'Impedimento de última hora: a Batalha acabou.', { seat: ctx.me });
    },
  },
});
