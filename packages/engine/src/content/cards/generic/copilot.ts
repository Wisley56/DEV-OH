import { defineCard, log, nameOf, prosOf, rand } from '../../../effects/api';
import { targetPro } from '../../helpers';

export default defineCard({
  def: {
    id: 'copilot',
    name: 'Copilot Autocomplete',
    kind: 'pro',
    typeLine: 'IA / Ferramenta / Efeito',
    attribute: 'LUZ',
    level: 3,
    atk: 1200,
    def: 1000,
    tags: ['ia'],
    art: 'icon:✨|#0d3b66|#3fa7d6',
    text: 'Autocomplete (1x por turno): 1 Profissional seu ganha +600 ATK até o fim do turno. 25% de chance de completar errado: −600 ATK.',
    ignition: { label: 'Autocompletar', target: 'ownPro' },
  },
  effects: {
    canIgnite: (ctx) => (prosOf(ctx.s, ctx.me).length ? null : 'Sem Profissionais para ajudar.'),
    onIgnite(ctx) {
      const f = targetPro(ctx, 'me');
      if (!f) return;
      const wrong = rand(ctx.s) < 0.25;
      f.slot.tempAtk += wrong ? -600 : 600;
      log(
        ctx.s,
        'effect',
        wrong
          ? `Copilot completou errado! "${nameOf(f.slot.card)}" −600 ATK.`
          : `Copilot acertou de primeira: "${nameOf(f.slot.card)}" +600 ATK.`,
        { seat: ctx.me, cardId: 'copilot' },
      );
    },
  },
});
