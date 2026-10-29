import { addStress, defineCard, heal } from '../../../effects/api';

export default defineCard({
  def: {
    id: 'home_office',
    name: 'Home Office',
    kind: 'task',
    rarity: 'comum',
    speed: 'normal',
    art: 'icon:🏠|#1d3557|#a8dadc',
    text: 'Seu Estresse −2 e você recupera 1000 LP.',
    flavor: 'De pijama, mas com a câmera desligada.',
  },
  effects: {
    onActivate(ctx) {
      addStress(ctx.s, ctx.me, -2);
      heal(ctx.s, ctx.me, 1000);
    },
  },
});
