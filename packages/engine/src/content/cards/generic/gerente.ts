import { addStress, defineCard, log } from '../../../effects/api';

export default defineCard({
  def: {
    id: 'gerente',
    name: 'Gerente de Planilha',
    kind: 'pro',
    rarity: 'rara',
    typeLine: 'Humano / Gerente',
    attribute: 'TREVA',
    level: 5,
    atk: 2000,
    def: 1300,
    art: 'icon:📊|#14213d|#fca311',
    text: 'Cobrança de status: no início do seu turno, o oponente ganha +1 de Estresse.',
    flavor: '"Qual o status disso?"',
  },
  effects: {
    onStandby(ctx) {
      log(ctx.s, 'effect', 'Gerente: "Qual o status disso?"', { seat: ctx.me, cardId: 'gerente' });
      addStress(ctx.s, ctx.opp, 1, true);
    },
  },
});
