import {
  actionCost,
  customCardInput,
  isPassive,
  MAX_STRESS,
  type CustomCardInput,
  type EffectAction,
  type EffectBlock,
  type Trigger,
} from '@devoh/engine';
import { strongest } from './board';
import type { PlayCtx } from './cardPlays';

/**
 * Plano B do bot normal para cards criados no painel (ids `x_`): em vez de uma regra escrita
 * à mão, lê os blocos. Joga quando o saldo das ações é a favor e nunca leva o próprio Estresse
 * ao limite (o colapso derruba o melhor Profissional). Os cards em código não passam por aqui.
 */

type Play = { target?: string } | null;

const blocksOf = (input: CustomCardInput, when: Trigger) =>
  (input.effects ?? []).filter((p): p is EffectBlock => !isPassive(p) && p.when === when);

/** Quanto o próprio Estresse sobe com as ações. */
const ownStress = (actions: EffectAction[]) => actions.reduce((n, a) => n + (a.do === 'stress' && a.side !== 'opp' ? a.amount : 0), 0);

/** Saldo e risco de disparar estes blocos agora. */
function worth(c: PlayCtx, input: CustomCardInput, blocks: EffectBlock[]): boolean {
  if (!blocks.length) return false;
  const actions = blocks.flatMap((b) => b.do);
  if (c.me.stress + ownStress(actions) >= MAX_STRESS) return false;
  // Aliviar Estresse sem ter Estresse não vale a carta.
  if (actions.every((a) => a.do === 'stress' && a.side === 'me' && a.amount < 0) && c.me.stress < 2) return false;
  if (actions.some((a) => a.do === 'heal') && actions.length === 1 && c.me.lp > 3000) return false;
  return actions.reduce((n, a) => n + actionCost(a, input), 0) > 0;
}

/** Alvo do "alvo escolhido": seu Profissional mais forte para bônus, o do oponente para o resto. */
function chosenTarget(c: PlayCtx, input: CustomCardInput, blocks: EffectBlock[]): Play {
  const actions = blocks.flatMap((b) => b.do).filter((a) => 'target' in a && a.target === 'chosen');
  if (!actions.length) return {};
  const buff = actions.every((a) => (a.do === 'tempAtk' && a.amount > 0) || (a.do === 'modStats' && (a.atk || a.def) > 0));
  const side = input.target === 'ownPro' || (input.target === 'anyPro' && buff) ? c.seat : c.opp;
  const t = strongest(c.s, side, (x) => side !== c.seat || !x.faceDown);
  return t ? { target: t.card.iid } : null;
}

/** Ativar uma Task do painel agora? `undefined` = não é card do painel. */
export function dslTaskPlay(cardId: string): ((c: PlayCtx) => Play) | undefined {
  const input = customCardInput(cardId);
  if (!input || input.kind !== 'task') return undefined;
  return (c) => {
    if (input.speed === 'equip') {
      const t = strongest(c.s, c.seat, (x) => !x.faceDown);
      return t ? { target: t.card.iid } : null;
    }
    const blocks = blocksOf(input, 'activate');
    // Contínua/Campo só com efeitos passivos: sempre vale ligar.
    if (!blocks.length) return (input.effects ?? []).length ? {} : null;
    return worth(c, input, blocks) ? chosenTarget(c, input, blocks) : null;
  };
}

/** Usar o efeito ativável de um Profissional do painel agora? */
export function dslIgnitionPlay(cardId: string): ((c: PlayCtx) => Play) | undefined {
  const input = customCardInput(cardId);
  if (!input || input.kind !== 'pro') return undefined;
  const blocks = blocksOf(input, 'ignition');
  if (!blocks.length) return undefined;
  return (c) => (worth(c, input, blocks) ? chosenTarget(c, input, blocks) : null);
}

/** Invocar um Profissional do painel agora? Não se o efeito de invocação estourar o próprio Estresse. */
export function dslSummonOk(cardId: string): ((c: PlayCtx) => boolean) | undefined {
  const input = customCardInput(cardId);
  if (!input || input.kind !== 'pro') return undefined;
  const up = ownStress(blocksOf(input, 'summon').flatMap((b) => b.do));
  return up > 0 ? (c) => c.me.stress + up < MAX_STRESS : undefined;
}
