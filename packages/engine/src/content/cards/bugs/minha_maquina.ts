import { addStress, defineCard } from '../../../effects/api';

export default defineCard({
  def: {
    id: 'minha_maquina',
    name: 'Na Minha Máquina Funciona',
    kind: 'bug',
    trigger: 'battleDamage',
    typeLine: 'Bug',
    art: 'icon:💻|#212529|#6c757d',
    text: 'Quando você receberia dano de batalha: o dano vira 0 e seu Estresse −1.',
  },
  effects: {
    onTrigger(ctx, ev) {
      ev.damage = 0;
      addStress(ctx.s, ctx.me, -1);
    },
  },
});
