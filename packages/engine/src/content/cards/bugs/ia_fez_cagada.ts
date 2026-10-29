import { addStress, defineCard, destroyPro, findPro, log, nameOf } from '../../../effects/api';
import { isIA } from '../../helpers';

export default defineCard({
  def: {
    id: 'ia_fez_cagada',
    name: 'A IA Fez Cagada',
    kind: 'bug',
    trigger: 'oppSummon',
    typeLine: 'Bug',
    art: 'icon:💩|#3c1518|#d58936',
    text: 'Quando o oponente invoca um Profissional: ele perde 1000 ATK. Se for [IA], é destruído. O oponente ganha +1 de Estresse.',
  },
  effects: {
    onTrigger(ctx, ev) {
      const f = findPro(ctx.s, ev.summoned);
      if (!f) return;
      if (isIA(f.slot.card.cardId)) {
        destroyPro(ctx.s, f.slot.card.iid, { battle: false, bySeat: ctx.me });
      } else {
        f.slot.atkMod -= 1000;
        log(ctx.s, 'effect', `"${nameOf(f.slot.card)}" perdeu 1000 ATK por culpa da IA.`, { seat: f.seat });
      }
      addStress(ctx.s, ctx.opp, 1, true);
    },
  },
});
