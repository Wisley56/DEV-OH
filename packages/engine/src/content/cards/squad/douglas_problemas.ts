import { defineCard, findPro, isOnce, log, markOnce, pname } from '../../../effects/api';

export default defineCard({
  def: {
    id: 'douglas_problemas',
    name: 'Douglas (Dois Tipos de Problemas)',
    kind: 'pro',
    rarity: 'rara',
    typeLine: 'Guerreiro',
    attribute: 'TREVA',
    level: 4,
    atk: 1500,
    def: 1600,
    unique: true,
    tags: ['douglas'],
    art: '/art/douglas_problemas.webp',
    text: 'E quem disse que isso é problema meu? (1x por turno): quando um efeito do oponente aumentaria seu Estresse, o aumento vai todo para o oponente.',
    flavor: '"Na vida tem dois tipos de problemas… o meu e o seu."',
  },
  effects: {
    reflectOppStress(ctx) {
      const f = findPro(ctx.s, ctx.self.iid);
      if (!f || isOnce(f.slot.oncePerTurn, 'problemas', ctx.s.turn)) return false;
      markOnce(f.slot.oncePerTurn, 'problemas', ctx.s.turn);
      log(ctx.s, 'effect', `Douglas: "E quem disse que isso é problema meu?" — o Estresse volta para ${pname(ctx.s, ctx.opp)}.`, {
        seat: ctx.me,
        cardId: 'douglas_problemas',
      });
      return true;
    },
  },
});
