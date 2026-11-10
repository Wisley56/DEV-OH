import { card, type StatPart } from '@devoh/engine';
import { Crosshair, EyeOff, Lock, Zap } from 'lucide-react';
import { Button } from '../../../shared/ui';
import { CardFull } from '../../cards';
import { useDuel, useDuelUi } from '../hooks/useDuel';
import { useDuelActions } from '../hooks/useDuelActions';
import { cardActions, modLines, TARGET_PROMPTS } from '../services/interaction';

/** Painel lateral: card selecionado em tamanho grande, com as ações possíveis. */
export function CardInspector() {
  const { view, me, opp } = useDuel();
  const sel = useDuelUi((s) => s.sel);
  const select = useDuelUi((s) => s.select);
  const confirm = useDuelUi((s) => s.confirm);
  const { run } = useDuelActions();
  const { actions, hint } = cardActions(view, sel);
  const selectedPro = sel && [...me.pros, ...opp.pros].find((x) => x?.iid === sel.iid);
  const selectedSpell = sel && me.spells.find((x) => x?.iid === sel.iid);
  // Card seu virado para baixo: por que ele ainda não está fazendo nada.
  const note =
    sel?.where === 'myPro' && selectedPro?.faceDown
      ? 'Virado para baixo: sem efeito até ser virado para cima (Invocação-Virar, ou quando for atacado).'
      : selectedSpell?.setThisTurn
        ? 'Baixado neste turno: só dispara a partir do próximo turno.'
        : null;

  return (
    <div className="side-card" data-tour="inspector">
      {sel?.cardId ? (
        <>
          <CardFull cardId={sel.cardId} atk={selectedPro?.atk ?? undefined} def={selectedPro?.def ?? undefined} />
          <StatSources mods={selectedPro?.mods} />
          {note && (
            <p className="side-note">
              <EyeOff size={14} aria-hidden /> {note}
            </p>
          )}
          {confirm?.iid === sel.iid ? (
            <IgnitionConfirm cardId={confirm.cardId} />
          ) : (
            actions.length > 0 && (
              <div className="side-actions">
                {actions.map((a) => (
                  <Button key={a.label} variant={a.primary ? 'primary' : 'default'} onClick={() => run(a.intent)}>
                    {a.intent.kind === 'ignition' && <Zap size={16} aria-hidden />}
                    {a.label}
                  </Button>
                ))}
              </div>
            )
          )}
          {hint && (
            <p className="side-hint">
              <Lock size={14} aria-hidden /> {hint}
            </p>
          )}
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

/** De onde vem a diferença entre o ATK/DEF atual e o impresso no card. */
function StatSources({ mods }: { mods: readonly StatPart[] | undefined }) {
  const lines = modLines(mods);
  if (!lines.length) return null;
  return (
    <ul className="stat-sources" aria-label="De onde vem o ATK e a DEF">
      {lines.map((l, i) => (
        <li key={i} className={l.good ? 'is-good' : 'is-bad'}>
          <b>{l.values.join(' · ')}</b> {l.label}
        </li>
      ))}
    </ul>
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
      <p className="ability-title">
        <Zap size={16} aria-hidden /> {d.ignition?.label}
      </p>
      <p className="ability-text">{d.text}</p>
      {target && (
        <p className="ability-target">
          <Crosshair size={14} aria-hidden /> Alvo: {TARGET_PROMPTS[target].replace('Escolha ', '')}
        </p>
      )}
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
