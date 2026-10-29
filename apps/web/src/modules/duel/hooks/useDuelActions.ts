import { card, tributesNeeded, type Action, type TargetKind } from '@devoh/engine';
import {
  hasTargets,
  isTargetOptional,
  summonBase,
  TARGET_PROMPTS,
  toggleTribute,
  zoneMatchesTarget,
  type CardIntent,
  type Where,
} from '../services/interaction';
import { useDuel, useDuelUiApi } from './useDuel';

/** Jogadas do tabuleiro: envia ações e conduz as escolhas de sacrifício e alvo. */
export function useDuelActions() {
  const { ctrl, me, opp } = useDuel();
  const ui = useDuelUiApi();

  async function dispatch(a: Action) {
    ui.getState().setMode(null);
    ui.getState().select(null);
    const err = await ctrl.send(a);
    if (err) ui.getState().flashError(err);
  }

  /** Abre a escolha de alvo quando há alvos possíveis; senão envia direto. */
  function withTarget(base: Action, cardId: string, targetKind: TargetKind | undefined, via: 'card' | 'ignition') {
    if (!targetKind || !hasTargets(me, opp, targetKind)) return dispatch(base);
    ui.getState().setMode({
      kind: 'target',
      base,
      targetKind,
      optional: isTargetOptional(cardId, via),
      prompt: TARGET_PROMPTS[targetKind],
    });
  }

  function startSummon(iid: string, cardId: string, position: 'atk' | 'def') {
    const d = card(cardId);
    const need = tributesNeeded(d.level ?? 1);
    const base = summonBase(iid, position);
    if (need > 0) ui.getState().setMode({ kind: 'tribute', base, need, chosen: [] });
    else withTarget(base, cardId, d.target, 'card');
  }

  function run(intent: CardIntent) {
    switch (intent.kind) {
      case 'summon':
        return startSummon(intent.iid, intent.cardId, intent.position);
      case 'activate':
        return withTarget({ type: 'activate', iid: intent.iid }, intent.cardId, card(intent.cardId).target, 'card');
      case 'set':
        return dispatch({ type: 'set', iid: intent.iid });
      case 'attack':
        return intent.direct ? dispatch({ type: 'attack', iid: intent.iid }) : ui.getState().setMode({ kind: 'attack', iid: intent.iid });
      case 'ignition':
        return withTarget({ type: 'ignition', iid: intent.iid }, intent.cardId, card(intent.cardId).ignition?.target, 'ignition');
      case 'changePosition':
        return dispatch({ type: 'changePosition', iid: intent.iid });
    }
  }

  /** Clique numa zona: completa a escolha em andamento ou seleciona o card. */
  function clickZone(where: Where, iid: string, cardId: string | null) {
    const { mode, setMode, select } = ui.getState();
    if (mode?.kind === 'tribute' && where === 'myPro') {
      const { chosen, done } = toggleTribute(mode, iid);
      if (done) {
        const base = { ...mode.base, tributes: chosen };
        const d = card(me.hand!.find((c) => c.iid === base.iid)!.cardId);
        setMode(null);
        withTarget(base, d.id, d.target, 'card');
      } else setMode({ ...mode, chosen });
      return;
    }
    if (mode?.kind === 'target' && zoneMatchesTarget(mode.targetKind, where)) return dispatch({ ...mode.base, target: iid } as Action);
    if (mode?.kind === 'attack' && where === 'oppPro') return dispatch({ type: 'attack', iid: mode.iid, target: iid });
    setMode(null);
    select({ iid, cardId, where });
  }

  return { dispatch, run, clickZone };
}
