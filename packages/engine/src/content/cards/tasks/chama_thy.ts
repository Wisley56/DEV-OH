import { defineCard, draw, proOnField, searchDeck } from '../../../effects/api';
import { isThy } from '../../helpers';

export default defineCard({
  def: {
    id: 'chama_thy',
    name: 'Chama o Thy na DM!',
    kind: 'task',
    rarity: 'rara',
    speed: 'normal',
    art: 'icon:💬|#22223b|#9a8c98',
    text: 'Adicione 1 "Thy Gonzaguinha" do deck à mão. Se "Vitor" estiver no seu campo, compre também 1 card.',
  },
  effects: {
    canActivate: (ctx) => (ctx.s.players[ctx.me].deck.some((c) => isThy(c.cardId)) ? null : 'Nenhum Thy no deck.'),
    onActivate(ctx) {
      searchDeck(ctx.s, ctx.me, isThy);
      if (proOnField(ctx.s, ctx.me, 'vitor')) draw(ctx.s, ctx.me, 1);
    },
  },
});
