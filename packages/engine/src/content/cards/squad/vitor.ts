import { defineCard, log, searchDeck } from '../../../effects/api';
import { isThy } from '../../helpers';

export default defineCard({
  def: {
    id: 'vitor',
    name: 'Vitor (O Mochileiro)',
    kind: 'pro',
    rarity: 'super',
    typeLine: 'Humano / Dev / Mochileiro',
    attribute: 'AGUA',
    level: 4,
    atk: 1600,
    def: 1200,
    unique: true,
    art: '/art/vitor.webp',
    text: 'Vitão: ao ser invocado, chama o "Thy Gonzaguinha" na DM — adicione 1 card "Thy Gonzaguinha" do deck à mão.',
    flavor: '"Eu sei o que você fez."',
  },
  effects: {
    onSummon(ctx) {
      if (!searchDeck(ctx.s, ctx.me, isThy))
        log(ctx.s, 'effect', 'Vitor chamou o Thy na DM… mas ele não respondeu (nenhum Thy no deck).', { seat: ctx.me });
    },
  },
});
