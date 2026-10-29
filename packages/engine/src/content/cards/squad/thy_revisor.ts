import { addStress, defineCard, destroyPro, findPro, log, prosOf } from '../../../effects/api';
import { isIA, targetPro } from '../../helpers';

export default defineCard({
  def: {
    id: 'thy_revisor',
    name: 'Thy Gonzaguinha',
    kind: 'pro',
    typeLine: 'Guerreiro / Modo Revisor / Efeito',
    attribute: 'TREVA',
    level: 7,
    atk: 2500,
    def: 3000,
    unique: true,
    tags: ['thy'],
    art: '/art/thy_revisor.webp',
    text:
      'Modo Revisor: sempre que um Bug for ativado (por qualquer jogador), ganha +500 ATK até o fim do turno. ' +
      '1x por turno: destrua 1 Profissional [IA] do oponente; o oponente ganha +2 de Estresse.',
    flavor: 'Não me chame de "Revisor Humano"!',
    ignition: { label: 'Revisar a IA', target: 'oppPro' },
  },
  effects: {
    canIgnite: (ctx) => (prosOf(ctx.s, ctx.opp).some((p) => isIA(p.card.cardId)) ? null : 'O oponente não tem nenhuma [IA] para revisar.'),
    onIgnite(ctx) {
      const f = targetPro(ctx, 'opp');
      if (!f || !isIA(f.slot.card.cardId)) return;
      log(ctx.s, 'effect', 'Thy ativou o Modo Revisor: a IA tremeu na base!', { seat: ctx.me, cardId: 'thy_revisor' });
      destroyPro(ctx.s, f.slot.card.iid, { battle: false, bySeat: ctx.me });
      addStress(ctx.s, ctx.opp, 2, true);
    },
    onAnyBug(ctx) {
      const f = findPro(ctx.s, ctx.self.iid);
      if (!f) return;
      f.slot.tempAtk += 500;
      log(ctx.s, 'effect', 'Thy entrou no Modo Revisor: +500 ATK até o fim do turno.', { seat: ctx.me, cardId: 'thy_revisor' });
    },
  },
});
