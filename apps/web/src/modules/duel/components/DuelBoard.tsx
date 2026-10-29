import { useEffect, useState } from 'react';
import { DuelContext, DuelUiContext, useDuel, useDuelUi } from '../hooks/useDuel';
import type { DuelController } from '../ports';
import { selectionExists } from '../services/interaction';
import { createDuelUiStore } from '../store/duelUiStore';
import { CardInspector } from './CardInspector';
import { DuelLog, LogFab } from './DuelLog';
import { DuelToasts } from './DuelToasts';
import { Hand } from './Hand';
import { ProRow, SpellRow } from './FieldRows';
import { PhaseBar } from './PhaseBar';
import { PlayerHud } from './PlayerHud';
import { VictoryDialog } from './VictoryDialog';

/** Tabuleiro do duelo. Funciona com qualquer DuelController (treino local ou sala online). */
export function DuelBoard({ controller }: { controller: DuelController }) {
  const [ui] = useState(() => createDuelUiStore(controller.view.log.at(-1)?.id ?? 0));
  return (
    <DuelContext.Provider value={controller}>
      <DuelUiContext.Provider value={ui}>
        <BoardLayout />
      </DuelUiContext.Provider>
    </DuelContext.Provider>
  );
}

function BoardLayout() {
  const { ctrl, view, myTurn } = useDuel();
  const sel = useDuelUi((s) => s.sel);
  const showLog = useDuelUi((s) => s.showLog);
  useSyncWithView();

  return (
    <div className="duel">
      <aside className={`side ${sel ? 'has-sel' : ''} ${showLog ? 'show-log' : ''}`}>
        <CardInspector />
        <DuelLog />
      </aside>

      <main className="arena">
        {ctrl.banner}
        <PlayerHud side="opp" active={view.active !== view.you} />
        <div className="field opp">
          <SpellRow side="opp" />
          <ProRow side="opp" />
        </div>
        <PhaseBar />
        <div className="field mine">
          <ProRow side="me" />
          <SpellRow side="me" />
        </div>
        <PlayerHud side="me" active={myTurn} />
        <Hand />
      </main>

      <DuelToasts />
      <VictoryDialog />
      <LogFab />
    </div>
  );
}

/** Mantém a interface coerente quando o jogo muda: fim do turno, cards que saíram, histórico lido. */
function useSyncWithView() {
  const { view, myTurn } = useDuel();
  const sel = useDuelUi((s) => s.sel);
  const showLog = useDuelUi((s) => s.showLog);
  const setMode = useDuelUi((s) => s.setMode);
  const select = useDuelUi((s) => s.select);
  const markLogSeen = useDuelUi((s) => s.markLogSeen);
  const lastLogId = view.log.at(-1)?.id ?? 0;

  useEffect(() => {
    if (!myTurn) setMode(null);
  }, [myTurn, setMode]);

  useEffect(() => {
    if (sel && !selectionExists(view, sel)) select(null);
  }, [view]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (showLog) markLogSeen(lastLogId);
  }, [showLog, lastLogId, markLogSeen]);
}
