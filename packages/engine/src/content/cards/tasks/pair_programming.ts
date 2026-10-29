import { defineCard, log, proLabel } from '../../../effects/api';
import { targetPro } from '../../helpers';

export default defineCard({
  def: {
    id: 'pair_programming',
    name: 'Pair Programming',
    kind: 'task',
    rarity: 'rara',
    speed: 'quick',
    target: 'ownPro',
    targetRequired: true,
    art: 'icon:👥|#264653|#2a9d8f',
    text: 'Rápida (também na Batalha): 1 Profissional seu não é destruído em batalha neste turno, e você não recebe dano de batalha com ele.',
    flavor: 'Um digita, o outro aponta o erro. Ninguém cai sozinho.',
  },
  effects: {
    onActivate(ctx) {
      const f = targetPro(ctx, 'me');
      if (!f) return;
      f.slot.protectedTurn = ctx.s.turn;
      log(ctx.s, 'effect', `Pair Programming: ${proLabel(f.slot)} está protegido neste turno.`, {
        seat: ctx.me,
        cardId: 'pair_programming',
      });
    },
  },
});
