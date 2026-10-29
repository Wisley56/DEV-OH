import { AnimatePresence, m } from 'framer-motion';
import { CardMini } from '../../cards';
import { useDuel, useDuelUi } from '../hooks/useDuel';
import { useDuelActions } from '../hooks/useDuelActions';
import { isTargetable, type Where } from '../services/interaction';
import { DropZone } from './HandDnd';

type Side = 'me' | 'opp';

/** Zonas de Profissionais de um lado do campo. */
export function ProRow({ side }: { side: Side }) {
  const { me, opp } = useDuel();
  const mode = useDuelUi((s) => s.mode);
  const selected = useDuelUi((s) => s.sel?.iid);
  const { clickZone } = useDuelActions();
  const mine = side === 'me';
  const p = mine ? me : opp;
  const where: Where = mine ? 'myPro' : 'oppPro';
  const tributeChosen = mine && mode?.kind === 'tribute' ? mode.chosen : [];
  return (
    <div className="row pro-row">
      {p.pros.map((x, i) => (
        <DropZone key={i} target={{ row: 'pro', zone: i }} enabled={mine} className="zone zone-pro" slotIid={x?.iid}>
          <AnimatePresence mode="popLayout">
            {x && (
              <m.button
                key={x.iid + x.cardId}
                className={`zone-card ${x.position === 'def' ? 'is-def' : ''} ${isTargetable(mode, where, x.iid, opp) ? 'targetable' : ''} ${selected === x.iid ? 'selected' : ''} ${tributeChosen.includes(x.iid) ? 'tribute' : ''} ${mine && x.canAttack ? 'ready' : ''}`}
                initial={{ scale: 1.6, opacity: 0, y: mine ? 40 : -40 }}
                animate={{ scale: 1, opacity: 1, y: 0, rotate: x.position === 'def' ? 90 : 0 }}
                exit={{ scale: 0.4, opacity: 0, rotate: 25, filter: 'brightness(3)' }}
                transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                onClick={() => clickZone(where, x.iid, x.cardId)}
              >
                <CardMini
                  cardId={x.cardId}
                  atk={x.atk}
                  def={x.def}
                  position={x.position}
                  badge={
                    x.negated ? (
                      <span className="badge" title="Efeitos anulados neste turno">
                        🚫
                      </span>
                    ) : x.locked ? (
                      <span className="badge">💘</span>
                    ) : mine && x.canIgnite ? (
                      <span className="badge badge-ability" title="Habilidade disponível">
                        ⚡
                      </span>
                    ) : undefined
                  }
                />
              </m.button>
            )}
          </AnimatePresence>
        </DropZone>
      ))}
    </div>
  );
}

/** Zona de Campo, Tasks/Bugs e cemitério ("Desligados") de um lado. */
export function SpellRow({ side }: { side: Side }) {
  const { me, opp } = useDuel();
  const mode = useDuelUi((s) => s.mode);
  const selected = useDuelUi((s) => s.sel?.iid);
  const { clickZone } = useDuelActions();
  const mine = side === 'me';
  const p = mine ? me : opp;
  const where: Where = mine ? 'mySpell' : 'oppSpell';
  const fieldWhere: Where = mine ? 'myField' : 'oppField';
  return (
    <div className="row spell-row">
      <DropZone target={{ row: 'field', zone: 0 }} enabled={mine} className="zone zone-field" title="Zona de Campo">
        {p.field ? (
          <button
            className={`zone-card ${selected === p.field.iid ? 'selected' : ''}`}
            onClick={() => clickZone(fieldWhere, p.field!.iid, p.field!.cardId)}
          >
            <CardMini cardId={p.field.cardId} />
          </button>
        ) : (
          <span className="zone-label">Campo</span>
        )}
      </DropZone>
      {p.spells.map((x, i) => (
        <DropZone key={i} target={{ row: 'spell', zone: i }} enabled={mine} className="zone zone-spell" slotIid={x?.iid}>
          <AnimatePresence mode="popLayout">
            {x && (
              <m.button
                key={x.iid}
                className={`zone-card ${isTargetable(mode, where, x.iid, opp) ? 'targetable' : ''} ${selected === x.iid ? 'selected' : ''}`}
                initial={{ opacity: 0, y: mine ? 30 : -30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, rotateY: 90, scale: 1.2 }}
                onClick={() => clickZone(where, x.iid, x.cardId)}
              >
                <CardMini
                  cardId={x.cardId}
                  faceDown={x.faceDown}
                  badge={!mine && x.revealed && x.faceDown ? <span className="badge">👁</span> : undefined}
                />
              </m.button>
            )}
          </AnimatePresence>
        </DropZone>
      ))}
      <div className="zone zone-grave" title="Desligados (cemitério)" data-grave={side}>
        {p.grave.length ? (
          <button className="zone-card" onClick={() => clickZone('grave', `grave-${mine}`, p.grave[p.grave.length - 1])}>
            <CardMini cardId={p.grave[p.grave.length - 1]} className="grave-top" />
          </button>
        ) : (
          <span className="zone-label">
            <span className="zone-label-icon" aria-hidden>
              🪦
            </span>
            <span className="zone-label-text">Desligados</span>
          </span>
        )}
      </div>
    </div>
  );
}
