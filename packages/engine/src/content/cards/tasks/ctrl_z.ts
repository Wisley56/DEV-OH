import { defineCard, log, proLabel } from '../../../effects/api';
import { targetPro } from '../../helpers';

export default defineCard({
  def: {
    id: 'ctrl_z',
    name: 'Ctrl+Z',
    kind: 'task',
    rarity: 'comum',
    speed: 'quick',
    target: 'ownPro',
    targetRequired: true,
    art: 'icon:↩️|#0b132b|#5bc0be',
    text: 'Rápida (também na Batalha): 1 Profissional seu ganha +800 ATK até o fim do turno.',
    flavor: 'Desfazer, desfazer, desfazer… pronto, voltou a funcionar.',
  },
  effects: {
    onActivate(ctx) {
      const f = targetPro(ctx, 'me');
      if (!f) return;
      f.slot.tempAtk += 800;
      log(ctx.s, 'effect', `Ctrl+Z: ${proLabel(f.slot)} ganhou +800 ATK neste turno.`, { seat: ctx.me, cardId: 'ctrl_z' });
    },
  },
});
