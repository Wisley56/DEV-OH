import { Button } from '../../../shared/ui';
import { CardFull } from '../../cards';
import { useDuel, useDuelUi } from '../hooks/useDuel';
import { useDuelActions } from '../hooks/useDuelActions';
import { cardActions } from '../services/interaction';

/** Painel lateral: card selecionado em tamanho grande, com as ações possíveis. */
export function CardInspector() {
  const { view, me, opp } = useDuel();
  const sel = useDuelUi((s) => s.sel);
  const select = useDuelUi((s) => s.select);
  const { run } = useDuelActions();
  const { actions, hint } = cardActions(view, sel);
  const selectedPro = sel && [...me.pros, ...opp.pros].find((x) => x?.iid === sel.iid);

  return (
    <div className="side-card">
      {sel?.cardId ? (
        <>
          <CardFull cardId={sel.cardId} atk={selectedPro?.atk} def={selectedPro?.def} />
          {actions.length > 0 && (
            <div className="side-actions">
              {actions.map((a) => (
                <Button key={a.label} variant={a.primary ? 'primary' : 'default'} onClick={() => run(a.intent)}>
                  {a.label}
                </Button>
              ))}
            </div>
          )}
          {hint && <p className="side-hint">🔒 {hint}</p>}
          <Button variant="ghost" className="side-close" onClick={() => select(null)}>
            Fechar
          </Button>
        </>
      ) : (
        <div className="side-empty">
          <p className="side-empty-title">Clique num card</p>
          <p>para ver o texto completo e as ações disponíveis.</p>
        </div>
      )}
    </div>
  );
}
