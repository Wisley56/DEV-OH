import { defineCard, destroyPro } from '../../../effects/api';

export default defineCard({
  def: {
    id: 'erro_404',
    name: 'Erro 404',
    kind: 'bug',
    rarity: 'rara',
    trigger: 'oppDirectAttack',
    art: 'icon:🕳️|#000000|#5a189a',
    text: 'Quando o oponente declara um ataque direto: o atacante é destruído. Página não encontrada.',
  },
  effects: {
    onTrigger(ctx, ev) {
      ev.negated = true;
      if (ev.attacker) destroyPro(ctx.s, ev.attacker, { battle: false, bySeat: ctx.me });
    },
  },
});
