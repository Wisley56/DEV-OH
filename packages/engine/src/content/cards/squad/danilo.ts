import { defineCard, hasFaceUp, isOnce, log, markOnce } from '../../../effects/api';

export default defineCard({
  def: {
    id: 'danilo',
    name: 'Danilo (DEV Raiz)',
    kind: 'pro',
    rarity: 'ultra',
    typeLine: 'Humano / Dev Mobile',
    attribute: 'TERRA',
    level: 6,
    atk: 2100,
    def: 2200,
    unique: true,
    art: '/art/danilo.webp',
    text:
      'Leiteiro: com "Estoque de Leite" no seu campo, o ATK base dele dobra. ' +
      'Foi o Claude (1x por turno): o primeiro dano de batalha que você receberia vira 0 — a culpa é da IA.',
    flavor: '"Interface gráfica? Nem pensar! Só terminal."',
  },
  effects: {
    atkBase: (q, base) => (hasFaceUp(q.s, q.seat, 'leite') ? base * 2 : base),
    preventOwnerBattleDamage(ctx) {
      const p = ctx.s.players[ctx.me];
      if (isOnce(p.oncePerTurn, 'foiOClaude', ctx.s.turn)) return false;
      markOnce(p.oncePerTurn, 'foiOClaude', ctx.s.turn);
      log(ctx.s, 'effect', 'Danilo: "Foi o Claude!" — a culpa foi pra IA, dano anulado.', { seat: ctx.me, cardId: 'danilo' });
      return true;
    },
  },
});
