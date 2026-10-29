import { card, findPro, prosOf, type EffectCtx } from '../effects/api';

/** Utilitários compartilhados pelos efeitos dos cards do DEV-OH!. */

export const isThy = (id: string) => card(id).tags?.includes('thy') ?? false;
export const isIA = (id: string) => card(id).tags?.includes('ia') ?? false;
export const isCareca = (id: string) => card(id).tags?.includes('careca') ?? false;

/** Profissional escolhido como alvo, se estiver do lado pedido. */
export function targetPro(ctx: EffectCtx, side: 'me' | 'opp') {
  const f = findPro(ctx.s, ctx.target);
  if (!f) return null;
  if (f.seat !== (side === 'me' ? ctx.me : ctx.opp)) return null;
  return f;
}

export function needOppPro(ctx: EffectCtx) {
  return prosOf(ctx.s, ctx.opp).length ? null : 'O oponente não tem Profissionais no campo.';
}
