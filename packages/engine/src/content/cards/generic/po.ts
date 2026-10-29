import { addStress, defineCard, log } from '../../../effects/api';

export default defineCard({
  def: {
    id: 'po',
    name: 'PO do "Só um Botãozinho"',
    kind: 'pro',
    typeLine: 'Humano / PO / Efeito',
    attribute: 'FOGO',
    level: 4,
    atk: 1700,
    def: 1000,
    art: 'icon:🔘|#7a1c1c|#ff6b6b',
    text: 'É rapidinho: ao ser invocado, o oponente ganha +2 de Estresse.',
    flavor: '"É só um botão, faz em 5 minutos?"',
  },
  effects: {
    onSummon(ctx) {
      log(ctx.s, 'effect', 'PO: "É só um botãozinho, faz em 5 minutos?"', { seat: ctx.me, cardId: 'po' });
      addStress(ctx.s, ctx.opp, 2, true);
    },
  },
});
