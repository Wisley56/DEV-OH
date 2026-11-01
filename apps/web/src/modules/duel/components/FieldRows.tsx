import { AnimatePresence, m } from 'framer-motion';
import { Archive, Ban, Copy, Eye, HeartHandshake, Link2, Mountain, RefreshCw, User, Zap, type LucideIcon } from 'lucide-react';
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
  const equipped = new Set([...me.spells, ...opp.spells].map((x) => x?.equippedTo).filter(Boolean));
  return (
    <div className="row pro-row">
      {p.pros.map((x, i) => (
        <DropZone key={i} target={{ row: 'pro', zone: i }} enabled={mine} className="zone zone-pro" slotIid={x?.iid}>
          <AnimatePresence mode="popLayout">
            {x && (
              <m.button
                key={x.iid + x.cardId}
                className={`zone-card ${x.position === 'def' ? 'is-def' : ''} ${x.faceDown ? 'is-facedown' : ''} ${isTargetable(mode, where, x.iid, opp) ? 'targetable' : ''} ${selected === x.iid ? 'selected' : ''} ${tributeChosen.includes(x.iid) ? 'tribute' : ''} ${mine && x.canAttack ? 'ready' : ''}`}
                initial={{ scale: 1.6, opacity: 0, y: mine ? 40 : -40 }}
                animate={{ scale: 1, opacity: 1, y: 0, rotate: x.position === 'def' ? 90 : 0 }}
                exit={{ scale: 0.4, opacity: 0, rotate: 25, filter: 'brightness(3)' }}
                transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                onClick={() => clickZone(where, x.iid, x.cardId)}
              >
                <CardMini
                  cardId={x.cardId}
                  atk={x.atk ?? undefined}
                  def={x.def ?? undefined}
                  position={x.position}
                  faceDown={x.faceDown}
                  badge={
                    mine && x.canFlip ? (
                      <span className="badge badge-ability" title="Pode fazer a Invocação-Virar">
                        <RefreshCw size={12} strokeWidth={2.5} aria-hidden />
                      </span>
                    ) : x.negated ? (
                      <span className="badge" title="Efeitos anulados neste turno">
                        <Ban size={12} strokeWidth={2.5} aria-hidden />
                      </span>
                    ) : x.locked ? (
                      <span className="badge" title="Preso a outro Profissional">
                        <HeartHandshake size={12} strokeWidth={2.5} aria-hidden />
                      </span>
                    ) : mine && x.canIgnite ? (
                      <span className="badge badge-ability" title="Habilidade disponível">
                        <Zap size={12} strokeWidth={2.5} aria-hidden />
                      </span>
                    ) : equipped.has(x.iid) ? (
                      <span className="badge" title="Equipado">
                        <Link2 size={12} strokeWidth={2.5} aria-hidden />
                      </span>
                    ) : undefined
                  }
                />
              </m.button>
            )}
          </AnimatePresence>
          {!x && <EmptySlot Icon={User} label="Profissional" />}
        </DropZone>
      ))}
    </div>
  );
}

/** Slot vazio: ícone e rótulo, para dar para ver onde cada card cai. */
function EmptySlot({ Icon, label }: { Icon: LucideIcon; label: string }) {
  return (
    <span className="zone-label">
      <Icon size={16} strokeWidth={1.75} className="zone-label-icon" aria-hidden />
      <span className="zone-label-text">{label}</span>
    </span>
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
          <EmptySlot Icon={Mountain} label="Campo" />
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
                  badge={
                    x.equippedTo ? (
                      <span className="badge" title="Equipamento: preso a um Profissional">
                        <Link2 size={12} strokeWidth={2.5} aria-hidden />
                      </span>
                    ) : mine && x.canActivate ? (
                      <span className="badge badge-ability" title="Pode ser ativada">
                        <Zap size={12} strokeWidth={2.5} aria-hidden />
                      </span>
                    ) : !mine && x.revealed && x.faceDown ? (
                      <span className="badge" title="Revelado">
                        <Eye size={12} strokeWidth={2.5} aria-hidden />
                      </span>
                    ) : undefined
                  }
                />
              </m.button>
            )}
          </AnimatePresence>
          {!x && <EmptySlot Icon={Copy} label="Task / Bug" />}
        </DropZone>
      ))}
      <div className="zone zone-grave" title="Desligados (cemitério)" data-grave={side}>
        {p.grave.length ? (
          <button
            className="zone-card"
            aria-label={`Desligados: ${p.grave.length}`}
            onClick={() => clickZone('grave', `grave-${mine}`, p.grave[p.grave.length - 1])}
          >
            <CardMini cardId={p.grave[p.grave.length - 1]} className="grave-top" />
            <span className="grave-count" aria-hidden>
              <Archive size={11} strokeWidth={2.5} />
              {p.grave.length}
            </span>
          </button>
        ) : (
          <EmptySlot Icon={Archive} label="Desligados" />
        )}
      </div>
    </div>
  );
}
