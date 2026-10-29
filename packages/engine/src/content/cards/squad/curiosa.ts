import { addStress, bounceToHand, defineCard, destroySpell, findPro, log, randInt, setCardsOf, type EffectCtx } from '../../../effects/api';

export default defineCard({
  def: {
    id: 'curiosa',
    name: 'A Curiosa Caótica',
    kind: 'pro',
    rarity: 'super',
    typeLine: 'Guerreiro / Caos',
    attribute: 'LUZ',
    level: 4,
    atk: 1500,
    def: 1400,
    unique: true,
    art: '/art/curiosa.svg',
    text:
      'O que passa na cabeça dela?: no início do seu turno, sorteia 1 efeito — Ideia genial (+800 ATK no turno), Café (seu Estresse −2), ' +
      'Ranço (Estresse do oponente +2), Bug no sistema (destrói 1 card virado do oponente), Reunião (seu Estresse +1) ou "18h?" (volta para sua mão). ' +
      'FLIP — Ideia genial: faz 2 sorteios na hora.',
    flavor: 'Bug no sistema? Café? Ranço? 18h?',
  },
  effects: {
    onStandby: sorteio,
    onFlip(ctx) {
      sorteio(ctx);
      sorteio(ctx);
    },
  },
});

/** "O que passa na cabeça dela?": sorteia 1 dos 6 efeitos. */
function sorteio(ctx: EffectCtx) {
  const s = ctx.s;
  const f = findPro(s, ctx.self.iid);
  if (!f) return;
  const say = (t: string) => log(s, 'effect', `O que passa na cabeça dela? ${t}`, { seat: ctx.me, cardId: 'curiosa' });
  switch (randInt(s, 6)) {
    case 0:
      say('💡 Ideia genial! +800 ATK neste turno.');
      f.slot.tempAtk += 800;
      break;
    case 1:
      say('☕ Café.');
      addStress(s, ctx.me, -2);
      break;
    case 2:
      say('😒 Ranço do oponente.');
      addStress(s, ctx.opp, 2, true);
      break;
    case 3: {
      const sets = setCardsOf(s, ctx.opp);
      say(sets.length ? '🐞 Bug no sistema do oponente!' : '🐞 Bug no sistema… mas não achou nada.');
      if (sets.length) destroySpell(s, sets[randInt(s, sets.length)].card.iid);
      break;
    }
    case 4:
      say('📅 Lembrou da reunião.');
      addStress(s, ctx.me, 1);
      break;
    default:
      say('🕕 18h? Foi embora!');
      bounceToHand(s, ctx.self.iid);
  }
}
