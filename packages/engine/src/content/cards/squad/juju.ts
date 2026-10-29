import { defineCard, findPro, isOnce, log, markOnce, negatePro, prosOf } from '../../../effects/api';
import { needOppPro } from '../../helpers';

export default defineCard({
  def: {
    id: 'juju',
    name: 'Juju',
    kind: 'pro',
    typeLine: 'Guerreiro / Bombeiro / Efeito',
    attribute: 'TREVA',
    level: 5,
    atk: 1900,
    def: 2100,
    unique: true,
    tags: ['careca'],
    art: '/art/juju.webp',
    text:
      'Isso é meus ovos (1x por turno): os efeitos de todos os Profissionais do oponente ficam anulados até o fim do turno, ' +
      'e Juju não pode ser destruído por efeitos do oponente neste turno.',
    flavor: 'O bombeiro que apaga o fogo de todas as squads.',
    ignition: { label: 'Isso é meus ovos' },
  },
  effects: {
    canIgnite: needOppPro,
    onIgnite(ctx) {
      log(ctx.s, 'effect', 'Juju: "Isso é meus ovos!" — refutou todos os haters (efeitos do oponente anulados neste turno).', {
        seat: ctx.me,
        cardId: 'juju',
      });
      for (const p of prosOf(ctx.s, ctx.opp)) negatePro(ctx.s, p.card.iid, ctx.s.turn);
      const f = findPro(ctx.s, ctx.self.iid);
      if (f) markOnce(f.slot.oncePerTurn, 'ovos', ctx.s.turn);
    },
    immuneToOppEffects(ctx) {
      const f = findPro(ctx.s, ctx.self.iid);
      return f && isOnce(f.slot.oncePerTurn, 'ovos', ctx.s.turn) ? 'Juju: "Isso é meus ovos." — nem encostaram nele.' : null;
    },
  },
});
