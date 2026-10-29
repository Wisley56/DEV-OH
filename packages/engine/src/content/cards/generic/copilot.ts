import { defineCard, log, proLabel, prosOf, rand } from '../../../effects/api';
import { targetPro } from '../../helpers';

export default defineCard({
  def: {
    id: 'copilot',
    name: 'Copilot Autocomplete',
    kind: 'pro',
    rarity: 'rara',
    typeLine: 'IA / Ferramenta',
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
        wrong ? `Copilot completou errado! ${proLabel(f.slot)} −600 ATK.` : `Copilot acertou de primeira: ${proLabel(f.slot)} +600 ATK.`,
        { seat: ctx.me, cardId: 'copilot' },
      );
    },
  },
});
