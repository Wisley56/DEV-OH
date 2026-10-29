import { Button } from '../../../shared/ui';
import { SoundToggle } from '../../sound';
import { TurnTimer } from './TurnTimer';
import { useDuel, useDuelUi } from '../hooks/useDuel';
import { useDuelActions } from '../hooks/useDuelActions';
import { modeText } from '../services/interaction';

/** Linha do meio: selo, fase/turno, dica da escolha em andamento e botões de fase. */
export function PhaseBar() {
  const { ctrl, view, opp, myTurn } = useDuel();
  const { dispatch } = useDuelActions();
  const exit = () => (view.winner === null ? confirm('Desistir e sair do duelo?') && ctrl.exit() : ctrl.exit());
  return (
    <div className="midline">
      {ctrl.badge}
      {ctrl.turnDeadline && view.winner === null && <TurnTimer deadline={ctrl.turnDeadline} />}
      <div className="phase">
        <span className={`turn-dot ${myTurn ? 'mine' : ''}`} />
        {view.winner !== null ? 'Fim de duelo' : myTurn ? 'Seu turno' : `Turno de ${opp.name}`} · T{view.turn} ·{' '}
        {view.phase === 'main' ? 'Fase Principal' : view.phase === 'battle' ? 'Batalha' : '—'}
      </div>
      <ModeHint />
      <div className="phase-actions" data-tour="phase">
        {myTurn && view.phase === 'main' && view.turn > 1 && (
          <Button variant="battle" onClick={() => dispatch({ type: 'goBattle' })}>
            ⚔ Batalha
          </Button>
        )}
        {myTurn && (
          <Button variant="end" onClick={() => dispatch({ type: 'endTurn' })}>
            Encerrar turno ⏭
          </Button>
        )}
        {ctrl.onHelp && (
          <Button variant="ghost" size="sm" title="Como jogar (tour)" aria-label="Como jogar" onClick={ctrl.onHelp}>
            ?
          </Button>
        )}
        <SoundToggle />
        <Button variant="ghost" className="exit-btn" onClick={exit}>
          ✕ Sair
        </Button>
      </div>
    </div>
  );
}

/** Instrução da escolha em andamento (sacrifício, alvo, ataque), com atalhos. */
function ModeHint() {
  const { opp } = useDuel();
  const mode = useDuelUi((s) => s.mode);
  const setMode = useDuelUi((s) => s.setMode);
  const { dispatch } = useDuelActions();
  if (!mode) return null;
  return (
    <div className="mode-hint">
      <span>🎯 {modeText(mode)}</span>
      {mode.kind === 'attack' && !opp.pros.some(Boolean) && (
        <Button variant="primary" size="sm" onClick={() => dispatch({ type: 'attack', iid: mode.iid })}>
          Ataque direto
        </Button>
      )}
      {mode.kind === 'target' && mode.optional && (
        <Button size="sm" onClick={() => dispatch(mode.base)}>
          Sem alvo
        </Button>
      )}
      <Button variant="ghost" size="sm" onClick={() => setMode(null)}>
        Cancelar
      </Button>
    </div>
  );
}
