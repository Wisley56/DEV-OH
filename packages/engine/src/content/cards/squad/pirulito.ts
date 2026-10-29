import { defineCard, findPro, log, nameOf, rand } from '../../../effects/api';

export default defineCard({
  def: {
    id: 'pirulito',
    name: 'Pirulito Atordoado',
    kind: 'pro',
    typeLine: 'Humano / DJ / Efeito',
    attribute: 'TREVA',
    level: 3,
    atk: 1400,
    def: 1000,
    unique: true,
    art: '/art/pirulito.webp',
    text:
      'Playlist aleatória: enquanto estiver no campo, do forró brega ao clássico internacional, os Profissionais do oponente ficam Atordoados (−300 ATK). ' +
      'Ataque forte: quando um Profissional seu ataca um Profissional do oponente, 50% de chance de ganhar +500 ATK até o fim do turno.',
    flavor: '♪ Próxima faixa… ♪',
  },
  effects: {
    oppAura: () => ({ atk: -300 }),
    onAllyAttack(ctx, info) {
      if (!info.target) return;
      const a = findPro(ctx.s, info.attacker);
      if (!a) return;
      const hit = rand(ctx.s) < 0.5;
      log(
        ctx.s,
        'coin',
        hit
          ? `🎧 Ataque forte! "${nameOf(a.slot.card)}" pegou o alvo atordoado: +500 ATK.`
          : '🎧 A música trocou… sem ataque forte desta vez.',
        { seat: ctx.me, cardId: 'pirulito' },
      );
      if (hit) a.slot.tempAtk += 500;
    },
  },
});
