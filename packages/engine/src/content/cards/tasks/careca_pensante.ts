import { defineCard, log, nameOf, prosOf } from '../../../effects/api';
import { isCareca } from '../../helpers';

export default defineCard({
  def: {
    id: 'careca_pensante',
    name: 'Careca Pensante',
    kind: 'task',
    rarity: 'rara',
    speed: 'normal',
    art: '/art/careca_pensante.webp',
    text: 'Todos os Profissionais carecas no campo (dos dois lados!) recebem o poder do minoxidil: +500 ATK enquanto permanecerem no campo.',
    flavor: 'Não cresceu cabelo, mas cresceu o ATK.',
  },
  effects: {
    canActivate: (ctx) =>
      [...prosOf(ctx.s, ctx.me), ...prosOf(ctx.s, ctx.opp)].some((p) => !p.faceDown && isCareca(p.card.cardId))
        ? null
        : 'Nenhum careca no campo.',
    onActivate(ctx) {
      for (const p of [...prosOf(ctx.s, ctx.me), ...prosOf(ctx.s, ctx.opp)]) {
        if (p.faceDown || !isCareca(p.card.cardId)) continue;
        p.atkMod += 500;
        log(ctx.s, 'effect', `"${nameOf(p.card)}" recebeu o poder do minoxidil: +500 ATK.`, { seat: p.card.owner, cardId: p.card.cardId });
      }
    },
  },
});
