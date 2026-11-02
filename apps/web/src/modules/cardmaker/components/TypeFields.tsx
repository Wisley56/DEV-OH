import { BUG_TRIGGER_TEXT, statRow, type Attribute, type BugTrigger, type BugType, type CardKind, type TaskSpeed } from '@devoh/engine';
import { Field, NumberField } from '../../../shared/ui';
import { ATTR } from '../../cards';
import { withKind, withSpeed } from '../services/draft';
import { useCardMaker } from '../store/cardMakerStore';

const KINDS: { id: CardKind; label: string }[] = [
  { id: 'pro', label: 'Profissional' },
  { id: 'task', label: 'Task' },
  { id: 'bug', label: 'Bug' },
];

const SPEEDS: { id: TaskSpeed; label: string; hint: string }[] = [
  { id: 'normal', label: 'Normal', hint: 'resolve e vai pro cemitério' },
  { id: 'quick', label: 'Rápida', hint: 'também na Batalha' },
  { id: 'continuous', label: 'Contínua', hint: 'fica no campo' },
  { id: 'field', label: 'Campo', hint: 'fica no campo' },
  { id: 'equip', label: 'Equipamento', hint: 'presa a um Profissional seu' },
];

const BUG_TYPES: { id: BugType; label: string }[] = [
  { id: 'normal', label: 'Normal (dispara e sai)' },
  { id: 'continuous', label: 'Contínuo (fica virado para cima)' },
  { id: 'counter', label: 'Contra-Bug (anula Bugs do oponente)' },
];

const ATTRIBUTES = Object.keys(ATTR) as Attribute[];

/** Tipo do card e o que depende dele: nível/ATK/DEF, velocidade da Task ou gatilho do Bug. */
export function TypeFields({ locked }: { locked: boolean }) {
  const { input, edit } = useCardMaker();
  const row = statRow(input.level ?? 1);

  return (
    <fieldset className="cmk-fields" disabled={locked}>
      <div className="tabs cmk-kind" role="radiogroup" aria-label="Tipo de card">
        {KINDS.map((k) => (
          <button
            key={k.id}
            type="button"
            role="radio"
            aria-checked={input.kind === k.id}
            className={`tab ${input.kind === k.id ? 'on' : ''}`}
            onClick={() => edit((i) => withKind(i, k.id))}
          >
            {k.label}
          </button>
        ))}
      </div>

      {input.kind === 'pro' && (
        <>
          <div className="cmk-row">
            <NumberField
              label="Nível"
              value={input.level ?? 1}
              min={1}
              max={10}
              step={1}
              hint={row.tributes ? `Pede ${row.tributes} sacrifício${row.tributes > 1 ? 's' : ''}` : 'Sem sacrifício'}
              onChange={(level) => edit((i) => ({ ...i, level }))}
            />
            <Field label="Atributo">
              {(id) => (
                <select id={id} value={input.attribute} onChange={(e) => edit((i) => ({ ...i, attribute: e.target.value as Attribute }))}>
                  {ATTRIBUTES.map((a) => (
                    <option key={a} value={a}>
                      {ATTR[a].glyph} {ATTR[a].label}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          </div>
          <Field label="Raça / função" hint={'"Normal" ou "Efeito" entram sozinhos.'} count={`${(input.typeLine ?? '').length}/40`}>
            {(id) => (
              <input
                id={id}
                value={input.typeLine ?? ''}
                maxLength={40}
                placeholder="Humano / Tech Lead"
                onChange={(e) => edit((i) => ({ ...i, typeLine: e.target.value }))}
              />
            )}
          </Field>
          <div className="cmk-row">
            <NumberField label="ATK" value={input.atk ?? 0} min={0} max={3000} step={50} onChange={(atk) => edit((i) => ({ ...i, atk }))} />
            <NumberField label="DEF" value={input.def ?? 0} min={0} max={3000} step={50} onChange={(def) => edit((i) => ({ ...i, def }))} />
          </div>
          <p className="muted cmk-sum">
            ATK + DEF: <b className="mono">{(input.atk ?? 0) + (input.def ?? 0)}</b> · a curva do nível {input.level} é{' '}
            <span className="mono">{row.sum}</span> (Normal ganha +10%)
          </p>
        </>
      )}

      {input.kind === 'task' && (
        <fieldset className="cmk-choice">
          <legend>Velocidade da Task</legend>
          <div className="cmk-chips">
            {SPEEDS.map((s) => (
              <label key={s.id} className={`cmk-chip ${input.speed === s.id ? 'on' : ''}`}>
                <input type="radio" name="speed" checked={input.speed === s.id} onChange={() => edit((i) => withSpeed(i, s.id))} />
                {s.label}
                <small>{s.hint}</small>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {input.kind === 'bug' && (
        <>
          <Field label="Tipo de Bug">
            {(id) => (
              <select
                id={id}
                value={input.bugType ?? 'normal'}
                onChange={(e) => {
                  const bugType = e.target.value as BugType;
                  edit((i) => ({
                    ...i,
                    bugType,
                    // Contra-Bug só dispara contra Bug; os outros, nunca.
                    trigger: bugType === 'counter' ? 'oppBug' : i.trigger === 'oppBug' ? 'oppAttack' : i.trigger,
                  }));
                }}
              >
                {BUG_TYPES.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Dispara quando" hint="Bugs ficam virados no campo e disparam sozinhos quando a condição acontece.">
            {(id) => (
              <select
                id={id}
                value={input.trigger}
                disabled={input.bugType === 'counter'}
                onChange={(e) => edit((i) => ({ ...i, trigger: e.target.value as BugTrigger }))}
              >
                {(Object.keys(BUG_TRIGGER_TEXT) as BugTrigger[])
                  .filter((t) => (input.bugType === 'counter') === (t === 'oppBug'))
                  .map((t) => (
                    <option key={t} value={t}>
                      {BUG_TRIGGER_TEXT[t]}
                    </option>
                  ))}
              </select>
            )}
          </Field>
        </>
      )}
    </fieldset>
  );
}
