import { card } from './cards';
import {
  addStress,
  bounceToHand,
  damage,
  destroyPro,
  destroySpell,
  draw,
  findPro,
  findSpell,
  getAtk,
  heal,
  log,
  nameOf,
  pname,
  proOnField,
  prosOf,
  rand,
  randInt,
  searchDeck,
  setCardsOf,
  setPosition,
} from './ops';
import { defineEffects, type EffectCtx } from './registry';

const isThy = (id: string) => card(id).tags?.includes('thy') ?? false;
const isIA = (id: string) => card(id).tags?.includes('ia') ?? false;

function targetPro(ctx: EffectCtx, side: 'me' | 'opp') {
  const f = findPro(ctx.s, ctx.target);
  if (!f) return null;
  if (f.seat !== (side === 'me' ? ctx.me : ctx.opp)) return null;
  return f;
}

function needOppPro(ctx: EffectCtx) {
  return prosOf(ctx.s, ctx.opp).length ? null : 'O oponente não tem Profissionais no campo.';
}

defineEffects({
  // ───────────── Profissionais da squad ─────────────
  thy_revisor: {
    canIgnite: (ctx) =>
      prosOf(ctx.s, ctx.opp).some((p) => isIA(p.card.cardId)) ? null : 'O oponente não tem nenhuma [IA] para revisar.',
    onIgnite(ctx) {
      const f = targetPro(ctx, 'opp');
      if (!f || !isIA(f.slot.card.cardId)) return;
      log(ctx.s, 'effect', 'Thy ativou o Modo Revisor: a IA tremeu na base!', { seat: ctx.me, cardId: 'thy_revisor' });
      destroyPro(ctx.s, f.slot.card.iid, { battle: false, bySeat: ctx.me });
      addStress(ctx.s, ctx.opp, 2, true);
    },
  },
  thy_filosofo: {
    canIgnite: (ctx) => (ctx.s.players[ctx.me].stress > 0 ? null : 'Seu Estresse já está zerado.'),
    onIgnite(ctx) {
      log(ctx.s, 'effect', 'Thy colocou a mão na boca, pensativo… o PO achou que era estratégia.', { seat: ctx.me, cardId: 'thy_filosofo' });
      addStress(ctx.s, ctx.me, -2);
    },
  },
  vitor: {
    onSummon(ctx) {
      if (!searchDeck(ctx.s, ctx.me, isThy))
        log(ctx.s, 'effect', 'Vitor chamou o Thy na DM… mas ele não respondeu (nenhum Thy no deck).', { seat: ctx.me });
    },
  },
  douglas_calma: {
    onSummon(ctx) {
      log(ctx.s, 'effect', 'Douglas: "CALMA… RESPIRA… NÃO INFARTA!"', { seat: ctx.me, cardId: 'douglas_calma' });
      addStress(ctx.s, ctx.me, 1);
    },
  },
  wisley: {
    onStandby(ctx) {
      if (ctx.s.players[ctx.me].stress >= 6) {
        log(ctx.s, 'effect', 'Wisley: "Não tá fácil… mas segue o jogo."', { seat: ctx.me, cardId: 'wisley' });
        addStress(ctx.s, ctx.me, -1);
      }
    },
  },
  kelly: {
    onSummon(ctx) {
      const sets = setCardsOf(ctx.s, ctx.opp);
      for (const x of sets) x.revealed = true;
      log(
        ctx.s,
        'effect',
        sets.length
          ? `Kelly: "CUIDADO…" — revelou: ${sets.map((x) => `"${nameOf(x.card)}"`).join(', ')}.`
          : 'Kelly: "CUIDADO…" — mas o oponente não tinha nada escondido.',
        { seat: ctx.me, cardId: 'kelly' },
      );
    },
  },
  patricia: {
    onSummon(ctx) {
      // Até o fim do próximo turno do oponente (turno atual + 1).
      ctx.s.players[ctx.opp].shockedUntilTurn = ctx.s.turn + 1;
      log(ctx.s, 'effect', `"EU TÔ PASSADA, CHOCADA!!!" — ${pname(ctx.s, ctx.opp)} ficou Chocado até o fim do próximo turno.`, {
        seat: ctx.me,
        cardId: 'patricia',
      });
    },
  },
  gama: {
    onSummon(ctx) {
      const sets = setCardsOf(ctx.s, ctx.opp);
      if (sets.length) {
        const pick = sets[randInt(ctx.s, sets.length)];
        log(ctx.s, 'effect', 'Gama: "Babado forte!" — vazou um card do oponente.', { seat: ctx.me, cardId: 'gama' });
        destroySpell(ctx.s, pick.card.iid);
      }
      if (proOnField(ctx.s, ctx.me, 'patricia')) {
        log(ctx.s, 'effect', 'Patrícia e Gama juntos: a fofoca virou BOMBA!', { seat: ctx.me });
        addStress(ctx.s, ctx.opp, 2, true);
      }
    },
  },
  paquito: {
    onSummon(ctx) {
      const targets = prosOf(ctx.s, ctx.opp).filter((p) => p.position === 'atk');
      if (targets.length) {
        targets.sort((a, b) => getAtk(ctx.s, ctx.opp, b) - getAtk(ctx.s, ctx.opp, a));
        const t = targets[0];
        log(ctx.s, 'effect', `♪ Prepara o coração… ♪ "${nameOf(t.card)}" ficou encantado.`, { seat: ctx.me, cardId: 'paquito' });
        setPosition(ctx.s, t.card.iid, 'def');
        t.lockedUntilTurn = ctx.s.turn + 1;
      }
      heal(ctx.s, ctx.me, 500);
    },
  },
  moises: {
    canIgnite: (ctx) => (ctx.s.players[ctx.me].stress > 0 ? null : 'Sem Estresse, sem cochilo.'),
    onIgnite(ctx) {
      log(ctx.s, 'effect', 'Moisés: "ZZZZ… eu não tô suportando mais…" — tirou um cochilo.', { seat: ctx.me, cardId: 'moises' });
      addStress(ctx.s, ctx.me, -2);
      setPosition(ctx.s, ctx.self.iid, 'def');
    },
    onDestroyed(ctx, info) {
      if (!info.battle || !info.byIid) return;
      if (!findPro(ctx.s, info.byIid)) return;
      log(ctx.s, 'effect', 'Moisés aplicou um mata-leão na saída: finalização!', { seat: ctx.me, cardId: 'moises' });
      destroyPro(ctx.s, info.byIid, { battle: false, bySeat: ctx.me });
    },
  },
  curiosa: {
    onStandby(ctx) {
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
    },
  },

  // ───────────── Genéricos ─────────────
  claude_alucinando: {
    onSummon(ctx) {
      draw(ctx.s, ctx.me, 1);
      addStress(ctx.s, ctx.me, 1);
    },
  },
  copilot: {
    canIgnite: (ctx) => (prosOf(ctx.s, ctx.me).length ? null : 'Sem Profissionais para ajudar.'),
    onIgnite(ctx) {
      const f = targetPro(ctx, 'me');
      if (!f) return;
      const wrong = rand(ctx.s) < 0.25;
      f.slot.tempAtk += wrong ? -600 : 600;
      log(
        ctx.s,
        'effect',
        wrong
          ? `Copilot completou errado! "${nameOf(f.slot.card)}" −600 ATK.`
          : `Copilot acertou de primeira: "${nameOf(f.slot.card)}" +600 ATK.`,
        { seat: ctx.me, cardId: 'copilot' },
      );
    },
  },
  stackoverflow: {
    onSummon(ctx) {
      const p = ctx.s.players[ctx.me];
      const tasks = p.grave.map((c, i) => ({ c, i })).filter(({ c }) => card(c.cardId).kind === 'task');
      if (!tasks.length) {
        log(ctx.s, 'effect', 'Stack Overflow: nenhuma resposta encontrada.', { seat: ctx.me });
        return;
      }
      const pick = tasks[randInt(ctx.s, tasks.length)];
      p.grave.splice(pick.i, 1);
      p.hand.push(pick.c);
      log(ctx.s, 'effect', `Stack Overflow ressuscitou "${nameOf(pick.c)}" para a mão.`, { seat: ctx.me, cardId: pick.c.cardId });
    },
  },
  docker: {
    onDestroyed(ctx) {
      addStress(ctx.s, ctx.opp, 1, true);
    },
  },
  estagiario: {
    onSummon(ctx) {
      addStress(ctx.s, ctx.me, -1);
    },
  },
  po: {
    onSummon(ctx) {
      log(ctx.s, 'effect', 'PO: "É só um botãozinho, faz em 5 minutos?"', { seat: ctx.me, cardId: 'po' });
      addStress(ctx.s, ctx.opp, 2, true);
    },
  },
  cliente: {
    onSummon(ctx) {
      const f = targetPro(ctx, 'opp');
      if (f) bounceToHand(ctx.s, f.slot.card.iid);
    },
  },
  sre: {
    onSummon(ctx) {
      heal(ctx.s, ctx.me, 800);
    },
  },
  gerente: {
    onStandby(ctx) {
      log(ctx.s, 'effect', 'Gerente: "Qual o status disso?"', { seat: ctx.me, cardId: 'gerente' });
      addStress(ctx.s, ctx.opp, 1, true);
    },
  },

  // ───────────── Tasks ─────────────
  cafe: {
    onActivate(ctx) {
      addStress(ctx.s, ctx.me, -3);
      const f = targetPro(ctx, 'me');
      if (f) {
        f.slot.tempAtk += 500;
        log(ctx.s, 'effect', `"${nameOf(f.slot.card)}" tomou o café: +500 ATK.`, { seat: ctx.me });
      }
    },
  },
  home_office: {
    onActivate(ctx) {
      addStress(ctx.s, ctx.me, -2);
      heal(ctx.s, ctx.me, 1000);
    },
  },
  reuniao: {
    onActivate(ctx) {
      addStress(ctx.s, ctx.opp, 2, true);
      const f = targetPro(ctx, 'opp');
      if (f) setPosition(ctx.s, f.slot.card.iid, 'def');
    },
  },
  refatoracao: {
    canActivate: needOppPro,
    onActivate(ctx) {
      const f = targetPro(ctx, 'opp');
      if (f) destroyPro(ctx.s, f.slot.card.iid, { battle: false, bySeat: ctx.me });
      addStress(ctx.s, ctx.me, 2);
    },
  },
  code_review: {
    onActivate(ctx) {
      draw(ctx.s, ctx.me, 2);
    },
  },
  hotfix: {
    canActivate: (ctx) => (setCardsOf(ctx.s, ctx.opp).length ? null : 'O oponente não tem cards virados.'),
    onActivate(ctx) {
      const f = findSpell(ctx.s, ctx.target);
      if (f && f.seat === ctx.opp && f.slot.faceDown) destroySpell(ctx.s, f.slot.card.iid);
    },
  },
  daily: {
    onActivate(ctx) {
      addStress(ctx.s, ctx.me, 2);
      addStress(ctx.s, ctx.opp, 2, true);
      draw(ctx.s, ctx.me, 1);
    },
  },
  gato_gordo: {
    onStandby(ctx) {
      if (ctx.s.players[ctx.me].stress > 0) {
        log(ctx.s, 'effect', 'O Gato Gordo ronronou. Todo mundo relaxou um pouco.', { seat: ctx.me, cardId: 'gato_gordo' });
        addStress(ctx.s, ctx.me, -1);
      }
    },
  },
  deploy_sexta: {
    onActivate(ctx) {
      const s = ctx.s;
      const ok = rand(s) < 0.5;
      log(s, 'coin', ok ? '🪙 CARA! O deploy de sexta passou liso!' : '🪙 COROA! O deploy de sexta derrubou tudo!', { seat: ctx.me, cardId: 'deploy_sexta' });
      if (ok) {
        damage(s, ctx.opp, 3000, 'Deploy na Sexta-Feira');
        return;
      }
      const p = s.players[ctx.me];
      for (const pro of prosOf(s, ctx.me)) destroyPro(s, pro.card.iid, { battle: false, self: true });
      for (const sp of [...p.spells, p.field]) if (sp) destroySpell(s, sp.card.iid);
    },
  },
  ferias: {
    onActivate(ctx) {
      const p = ctx.s.players[ctx.me];
      addStress(ctx.s, ctx.me, -p.stress);
      p.noAttackTurn = ctx.s.turn;
    },
  },
  chama_thy: {
    canActivate: (ctx) => (ctx.s.players[ctx.me].deck.some((c) => isThy(c.cardId)) ? null : 'Nenhum Thy no deck.'),
    onActivate(ctx) {
      searchDeck(ctx.s, ctx.me, isThy);
      if (proOnField(ctx.s, ctx.me, 'vitor')) draw(ctx.s, ctx.me, 1);
    },
  },

  // ───────────── Bugs ─────────────
  ia_fez_cagada: {
    onTrigger(ctx, ev) {
      const f = findPro(ctx.s, ev.summoned);
      if (!f) return;
      if (isIA(f.slot.card.cardId)) {
        destroyPro(ctx.s, f.slot.card.iid, { battle: false, bySeat: ctx.me });
      } else {
        f.slot.atkMod -= 1000;
        log(ctx.s, 'effect', `"${nameOf(f.slot.card)}" perdeu 1000 ATK por culpa da IA.`, { seat: f.seat });
      }
      addStress(ctx.s, ctx.opp, 1, true);
    },
  },
  impedimento: {
    onTrigger(ctx, ev) {
      ev.negated = true;
      for (const p of prosOf(ctx.s, ctx.opp)) p.attackedTurn = ctx.s.turn;
      log(ctx.s, 'effect', 'Impedimento de última hora: a Batalha acabou.', { seat: ctx.me });
    },
  },
  mudanca_escopo: {
    onTrigger(ctx, ev) {
      ev.negated = true;
      if (ev.attacker) bounceToHand(ctx.s, ev.attacker);
    },
  },
  minha_maquina: {
    onTrigger(ctx, ev) {
      ev.damage = 0;
      addStress(ctx.s, ctx.me, -1);
    },
  },
  merge_conflict: {
    onTrigger(ctx, ev) {
      ev.negated = true;
      addStress(ctx.s, ctx.me, 1);
      addStress(ctx.s, ctx.opp, 1, true);
    },
  },
  erro_404: {
    onTrigger(ctx, ev) {
      ev.negated = true;
      if (ev.attacker) destroyPro(ctx.s, ev.attacker, { battle: false, bySeat: ctx.me });
    },
  },
  prod_caiu: {
    onTrigger(ctx) {
      damage(ctx.s, ctx.opp, 800, 'Prod Caiu');
      addStress(ctx.s, ctx.opp, 2, true);
    },
  },
});
