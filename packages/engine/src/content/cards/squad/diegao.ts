import { defineCard, findPro, isOnce, log, markOnce, nameOf, negatePro, proLabel } from '../../../effects/api';
import { needOppPro, targetPro } from '../../helpers';

export default defineCard({
  def: {
    id: 'diegao',
    name: 'Diegão',
    kind: 'pro',
    rarity: 'secreta',
    typeLine: 'Guerreiro / Superpesado',
    attribute: 'TREVA',
    level: 9,
    atk: 3000,
    def: 2800,
    unique: true,
    art: '/art/diegao.webp',
    text:
      'Patada Irônica (1x por turno): escolha 1 Profissional do oponente — os efeitos dele ficam anulados até o fim do turno e ele perde 1000 ATK. ' +
      'Coração de ouro (1x por turno): quando outro Profissional seu seria destruído em batalha, Diegão entra na frente e ele não é destruído.',
    flavor: 'O mais imprevisível da squad — e gente da gente.',
    ignition: { label: 'Patada Irônica', target: 'oppPro' },
  },
  effects: {
    canIgnite: needOppPro,
    onIgnite(ctx) {
      const f = targetPro(ctx, 'opp');
      if (!f) return;
      log(ctx.s, 'effect', `Diegão soltou uma Patada Irônica: ${proLabel(f.slot)} ficou sem reação (efeitos anulados, −1000 ATK).`, {
        seat: ctx.me,
        cardId: 'diegao',
        iid: ctx.self.iid,
        target: f.slot.card.iid,
      });
      negatePro(ctx.s, f.slot.card.iid, ctx.s.turn);
      f.slot.atkMod -= 1000;
    },
    saveAllyFromBattle(ctx, victim) {
      const f = findPro(ctx.s, ctx.self.iid);
      if (!f || isOnce(f.slot.oncePerTurn, 'coracao', ctx.s.turn)) return null;
      markOnce(f.slot.oncePerTurn, 'coracao', ctx.s.turn);
      return `Diegão tem coração de ouro: entrou na frente e "${nameOf(victim.card)}" não foi destruído.`;
    },
  },
});
