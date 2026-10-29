import { defineCard, destroySpell, log } from '../../../effects/api';

export default defineCard({
  def: {
    id: 'moises_bombado',
    name: 'Moisés Bombado',
    kind: 'task',
    rarity: 'rara',
    speed: 'equip',
    target: 'ownPro',
    // Baixado virado, dispara sozinho quando o oponente ataca um Profissional seu.
    trigger: 'oppAttack',
    art: '/art/moises_bombado.webp',
    text:
      'Equipamento: o poder da testosterona com mais de 8 mil! O Profissional equipado fica com o dobro de ATK e DEF neste turno; ' +
      'no fim do turno, este card é destruído. Baixado virado, ativa sozinho quando o oponente atacar um Profissional seu e equipa o atacado.',
    flavor: 'TESTOSTERONA: +8000!',
  },
  effects: {
    equip: () => ({ mult: 2 }),
    onEndTurn(ctx) {
      log(ctx.s, 'effect', 'Moisés Bombado: a testosterona baixou.', { seat: ctx.me, cardId: 'moises_bombado' });
      destroySpell(ctx.s, ctx.self.iid);
    },
  },
});
