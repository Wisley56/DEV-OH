import { card, tributesNeeded, type Action, type GameView, type HandCardView, type PlayerView, type TargetKind } from '@devoh/engine';

/**
 * Regras de interação do tabuleiro (funções puras): o que o jogador pode
 * fazer com o card selecionado, o que é alvo válido e como montar as ações.
 */

export type Where = 'hand' | 'myPro' | 'mySpell' | 'oppPro' | 'oppSpell' | 'myField' | 'oppField' | 'grave';

export interface Selection {
  iid: string;
  cardId: string | null;
  where: Where;
}

export type SummonAction = Extract<Action, { type: 'summon' }>;
/** Baixar um Profissional virado (também pode pedir sacrifício). */
export type SetAction = Extract<Action, { type: 'set' }>;

/** Modo de escolha em andamento: sacrifícios, alvo de efeito ou alvo de ataque. */
export type Mode =
  | { kind: 'tribute'; base: SummonAction | SetAction; need: number; chosen: string[] }
  | { kind: 'target'; base: Action; targetKind: TargetKind; optional: boolean; prompt: string }
  | { kind: 'attack'; iid: string };

/** O que um botão de ação do painel lateral faz. */
export type CardIntent =
  | { kind: 'summon'; iid: string; cardId: string; position: 'atk' | 'def' }
  | { kind: 'activate'; iid: string; cardId: string }
  | { kind: 'set'; iid: string }
  | { kind: 'setPro'; iid: string; cardId: string }
  | { kind: 'flipSummon'; iid: string }
  | { kind: 'attack'; iid: string; direct: boolean }
  | { kind: 'ignition'; iid: string; cardId: string }
  | { kind: 'changePosition'; iid: string };

export interface CardAction {
  label: string;
  primary?: boolean;
  intent: CardIntent;
}

export const TARGET_PROMPTS: Record<TargetKind, string> = {
  oppPro: 'Escolha um Profissional do oponente',
  ownPro: 'Escolha um Profissional seu',
  oppSet: 'Escolha um card virado do oponente',
  anyPro: 'Escolha um Profissional',
};

export function hasTargets(me: PlayerView, opp: PlayerView, kind: TargetKind): boolean {
  if (kind === 'oppPro') return opp.pros.some(Boolean);
  if (kind === 'ownPro') return me.pros.some(Boolean);
  if (kind === 'oppSet') return opp.spells.some((x) => x?.faceDown);
  return [...me.pros, ...opp.pros].some(Boolean);
}

/** Alvo pode ser pulado? Efeitos ativáveis sempre exigem; cards só quando marcados no catálogo. */
export function isTargetOptional(cardId: string, via: 'card' | 'ignition'): boolean {
  return via === 'card' && !card(cardId).targetRequired;
}

/** A zona clicada serve como alvo do tipo pedido? */
export function zoneMatchesTarget(kind: TargetKind, where: Where): boolean {
  return (
    (kind === 'oppPro' && where === 'oppPro') ||
    (kind === 'ownPro' && where === 'myPro') ||
    (kind === 'anyPro' && (where === 'myPro' || where === 'oppPro')) ||
    (kind === 'oppSet' && where === 'oppSpell')
  );
}

/** Destaque de "pode clicar aqui" durante uma escolha. */
export function isTargetable(mode: Mode | null, where: Where, iid: string, opp: PlayerView): boolean {
  if (!mode) return false;
  if (mode.kind === 'tribute') return where === 'myPro';
  if (mode.kind === 'attack') return where === 'oppPro';
  if (mode.targetKind === 'oppPro') return where === 'oppPro';
  if (mode.targetKind === 'ownPro') return where === 'myPro';
  if (mode.targetKind === 'anyPro') return where === 'myPro' || where === 'oppPro';
  return where === 'oppSpell' && !!opp.spells.find((x) => x?.iid === iid)?.faceDown;
}

/** Marca/desmarca um sacrifício; `done` quando já tem a quantidade necessária. */
export function toggleTribute(mode: Extract<Mode, { kind: 'tribute' }>, iid: string) {
  const chosen = mode.chosen.includes(iid) ? mode.chosen.filter((x) => x !== iid) : [...mode.chosen, iid];
  return { chosen, done: chosen.length === mode.need };
}

export function summonBase(iid: string, position: 'atk' | 'def', zone?: number): SummonAction {
  return zone === undefined ? { type: 'summon', iid, position, tributes: [] } : { type: 'summon', iid, position, tributes: [], zone };
}

export function setProBase(iid: string, zone?: number): SetAction {
  return zone === undefined ? { type: 'set', iid, tributes: [] } : { type: 'set', iid, tributes: [], zone };
}

/** Ações disponíveis para o card selecionado (e o motivo, se um Profissional não puder entrar). */
export function cardActions(view: GameView, sel: Selection | null): { actions: CardAction[]; hint: string | null } {
  const actions: CardAction[] = [];
  let hint: string | null = null;
  const me = view.players[view.you];
  const opp = view.players[view.you === 0 ? 1 : 0];
  const myTurn = view.active === view.you && view.winner === null;
  if (!sel || !myTurn) return { actions, hint };

  if (sel.where === 'hand') {
    const h = me.hand?.find((c) => c.iid === sel.iid);
    if (!h) return { actions, hint };
    const d = card(h.cardId);
    if (h.canSummon) {
      actions.push({
        label: 'Invocar em Ataque',
        primary: true,
        intent: { kind: 'summon', iid: h.iid, cardId: h.cardId, position: 'atk' },
      });
      actions.push({ label: 'Invocar em Defesa', intent: { kind: 'summon', iid: h.iid, cardId: h.cardId, position: 'def' } });
    }
    if (h.canActivate) actions.push({ label: 'Ativar Task', primary: true, intent: { kind: 'activate', iid: h.iid, cardId: d.id } });
    if (h.canSet && d.kind === 'bug') actions.push({ label: 'Baixar Bug virado', primary: true, intent: { kind: 'set', iid: h.iid } });
    if (h.canSet && d.kind === 'task') actions.push({ label: 'Baixar virada (blefe)', intent: { kind: 'set', iid: h.iid } });
    if (h.canSet && d.kind === 'pro')
      actions.push({ label: 'Baixar virado (Defesa)', intent: { kind: 'setPro', iid: h.iid, cardId: h.cardId } });
    if (d.kind === 'pro' && !h.canSummon) hint = summonBlockReason(view, me, d.level ?? 1);
  } else if (sel.where === 'myPro') {
    const p = me.pros.find((x) => x?.iid === sel.iid);
    if (!p?.cardId) return { actions, hint };
    const d = card(p.cardId);
    if (p.canFlip) actions.push({ label: 'Invocação-Virar', primary: true, intent: { kind: 'flipSummon', iid: p.iid } });
    const oppHasPros = opp.pros.some(Boolean);
    if (p.canAttack)
      actions.push({
        label: oppHasPros ? 'Atacar' : 'Ataque direto!',
        primary: true,
        intent: { kind: 'attack', iid: p.iid, direct: !oppHasPros },
      });
    if (p.canIgnite && d.ignition) actions.push({ label: d.ignition.label, intent: { kind: 'ignition', iid: p.iid, cardId: d.id } });
    if (p.canChangePos)
      actions.push({
        label: p.position === 'atk' ? 'Mudar para Defesa' : 'Mudar para Ataque',
        intent: { kind: 'changePosition', iid: p.iid },
      });
  } else if (sel.where === 'mySpell') {
    // Task baixada virada: ativa do campo.
    const x = me.spells.find((y) => y?.iid === sel.iid);
    if (x?.cardId && x.canActivate)
      actions.push({ label: 'Ativar Task', primary: true, intent: { kind: 'activate', iid: x.iid, cardId: x.cardId } });
  }
  return { actions, hint };
}

function summonBlockReason(view: GameView, me: PlayerView, level: number): string {
  const need = tributesNeeded(level);
  const onField = me.pros.filter(Boolean).length;
  if (view.phase !== 'main') return 'Invocações só na Fase Principal.';
  if (me.summonedThisTurn) return 'Você já fez sua invocação deste turno.';
  if (onField < need)
    return `Nível ${level}: precisa sacrificar ${need} Profissional${need > 1 ? 'is' : ''} do seu campo (você tem ${onField}). Invoque ${need > 1 ? 'outros' : 'outro'} antes.`;
  return 'Sem zona livre para Profissionais.';
}

/** O card selecionado ainda está no tabuleiro/mão? */
export function selectionExists(view: GameView, sel: Selection): boolean {
  const me = view.players[view.you];
  const opp = view.players[view.you === 0 ? 1 : 0];
  return (
    sel.where === 'grave' ||
    !!me.hand?.some((c) => c.iid === sel.iid) ||
    [...me.pros, ...opp.pros, ...me.spells, ...opp.spells, me.field, opp.field].some((x) => x?.iid === sel.iid)
  );
}

export function winnerText(view: GameView): string | null {
  if (view.winner === null) return null;
  if (view.winner === 'draw') return 'EMPATE';
  return view.winner === view.you ? 'SPRINT ENTREGUE!' : 'PROJETO CANCELADO…';
}

export function modeText(mode: Mode): string {
  if (mode.kind === 'tribute') return `Escolha ${mode.need - mode.chosen.length} Profissional(is) seu(s) para sacrificar`;
  if (mode.kind === 'attack') return 'Escolha o alvo do ataque';
  return mode.prompt;
}

/** Zona do meu lado do campo onde um card da mão pode ser solto. */
export interface DropTarget {
  row: 'pro' | 'spell' | 'field';
  zone: number;
}

/** O card da mão pode ser solto nessa zona? (mesmas regras dos botões do painel) */
export function canDropOn(c: HandCardView, target: DropTarget, me: PlayerView): boolean {
  const d = card(c.cardId);
  if (d.kind === 'pro') {
    if (!(c.canSummon || c.canSet) || target.row !== 'pro') return false;
    // Com sacrifício, qualquer zona de Profissional serve (a escolha segue no painel).
    return tributesNeeded(d.level ?? 1) > 0 || !me.pros[target.zone];
  }
  if (d.kind === 'bug') return c.canSet && target.row === 'spell' && !me.spells[target.zone];
  if (!c.canActivate) return false;
  if (d.speed === 'field') return target.row === 'field';
  if (d.speed === 'continuous') return target.row === 'spell' && !me.spells[target.zone];
  return target.row !== 'pro';
}
