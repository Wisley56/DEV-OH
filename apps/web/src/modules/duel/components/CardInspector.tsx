import { card } from '@devoh/engine';
import { Button } from '../../../shared/ui';
import { CardFull } from '../../cards';
import { useDuel, useDuelUi } from '../hooks/useDuel';
import { useDuelActions } from '../hooks/useDuelActions';
import { cardActions, TARGET_PROMPTS } from '../services/interaction';

/** Painel lateral: card selecionado em tamanho grande, com as ações possíveis. */
export function CardInspector() {
  const { view, me, opp } = useDuel();
  const sel = useDuelUi((s) => s.sel);
  const select = useDuelUi((s) => s.select);
  const confirm = useDuelUi((s) => s.confirm);
  const { run } = useDuelActions();
  const { actions, hint } = cardActions(view, sel);
  const selectedPro = sel && [...me.pros, ...opp.pros].find((x) => x?.iid === sel.iid);

  return (
    <div className="side-card" data-tour="inspector">
      {sel?.cardId ? (
        <>
          <CardFull cardId={sel.cardId} atk={selectedPro?.atk} def={selectedPro?.def} />
          {confirm?.iid === sel.iid ? (
            <IgnitionConfirm cardId={confirm.cardId} />
          ) : (
            actions.length > 0 && (
              <div className="side-actions">
                {actions.map((a) => (
                  <Button key={a.label} variant={a.primary ? 'primary' : 'default'} onClick={() => run(a.intent)}>
                    {a.intent.kind === 'ignition' ? `⚡ ${a.label}` : a.label}
                  </Button>
                ))}
              </div>
            )
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

/** Mostra o que a habilidade faz antes de usar: texto do card, alvo e confirmação. */
function IgnitionConfirm({ cardId }: { cardId: string }) {
  const setConfirm = useDuelUi((s) => s.setConfirm);
  const { confirmIgnition } = useDuelActions();
  const d = card(cardId);
  const target = d.ignition?.target;
  return (
    <div className="ability-confirm" role="dialog" aria-label={`Habilidade ${d.ignition?.label}`}>
      <p className="ability-title">⚡ {d.ignition?.label}</p>
      <p className="ability-text">{d.text}</p>
      {target && <p className="ability-target">🎯 Alvo: {TARGET_PROMPTS[target].replace('Escolha ', '')}</p>}
      <p className="ability-note">Pode ser usada 1x por turno.</p>
      <div className="side-actions">
        <Button variant="primary" onClick={confirmIgnition}>
          Usar habilidade
        </Button>
        <Button variant="ghost" onClick={() => setConfirm(null)}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
