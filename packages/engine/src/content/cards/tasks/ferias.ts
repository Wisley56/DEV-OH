import { addStress, defineCard } from '../../../effects/api';

export default defineCard({
  def: {
    id: 'ferias',
    name: 'Férias Aprovadas',
    kind: 'task',
    speed: 'normal',
    typeLine: 'Task',
    art: 'icon:🏖️|#023e8a|#ffd166',
    text: 'Seu Estresse vai a 0. Seus Profissionais não podem atacar neste turno.',
  },
  effects: {
    onActivate(ctx) {
      const p = ctx.s.players[ctx.me];
      addStress(ctx.s, ctx.me, -p.stress);
      p.noAttackTurn = ctx.s.turn;
    },
  },
});
