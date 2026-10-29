import { addStress, defineCard, findPro, isOnce, log, markOnce } from '../../../effects/api';

export default defineCard({
  def: {
    id: 'wisley',
    name: 'Wisley (Não Tá Fácil)',
    kind: 'pro',
    rarity: 'super',
    typeLine: 'Guerreiro / Defensor / Revanche',
    attribute: 'TERRA',
    level: 4,
    atk: 1200,
    def: 2100,
    unique: true,
    art: '/art/wisley.webp',
    text:
      'Não tá fácil… (1x por turno): não é destruído em batalha; você não recebe dano de batalha com ele. ' +
      'MESMO… (Revanche): sobreviveu a um ataque, ganha +500 ATK permanente. Destruiu um Profissional em batalha, oponente +2 de Estresse. ' +
      'Resiliência: Estresse 4+ no início do seu turno, −1. ' +
      'FLIP — Tô aqui: seu Estresse −2 e ele ganha +500 ATK permanente.',
    flavor: 'Resiliente a qualquer ataque… mas sempre alfineta.',
  },
  effects: {
    onFlip(ctx) {
      addStress(ctx.s, ctx.me, -2);
      const f = findPro(ctx.s, ctx.self.iid);
      if (f) f.slot.atkMod += 500;
      log(ctx.s, 'effect', 'Wisley: "Não tá fácil… mas tô aqui." — Estresse −2 e +500 ATK.', { seat: ctx.me, cardId: 'wisley' });
    },
    onStandby(ctx) {
      if (ctx.s.players[ctx.me].stress >= 4) {
        log(ctx.s, 'effect', 'Wisley: "Não tá fácil… mas segue o jogo."', { seat: ctx.me, cardId: 'wisley' });
        addStress(ctx.s, ctx.me, -1);
      }
    },
    saveFromBattle(ctx) {
      const f = findPro(ctx.s, ctx.self.iid);
      if (!f || isOnce(f.slot.oncePerTurn, 'naotafacil', ctx.s.turn)) return null;
      markOnce(f.slot.oncePerTurn, 'naotafacil', ctx.s.turn);
      return 'Wisley: "Não tá fácil… mesmo." — aguentou a pancada.';
    },
    afterSurviveAttack(ctx) {
      const f = findPro(ctx.s, ctx.self.iid);
      if (!f) return;
      f.slot.atkMod += 500;
      log(ctx.s, 'effect', 'Wisley: "Não tá fácil… MESMO." — acumulou rancor: +500 ATK permanente.', { seat: ctx.me, cardId: 'wisley' });
    },
    afterBattleKill(ctx) {
      log(ctx.s, 'effect', 'Wisley desabafou na daily: o oponente ganha +2 de Estresse.', { seat: ctx.me, cardId: 'wisley' });
      addStress(ctx.s, ctx.opp, 2, true);
    },
    shieldBattleDamage(ctx) {
      log(ctx.s, 'effect', 'Wisley segurou o tranco: nenhum dano de batalha.', { seat: ctx.me, cardId: 'wisley' });
      return true;
    },
  },
});
