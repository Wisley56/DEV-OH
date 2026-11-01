import { RARITIES, RARITY_INFO, type Rarity } from '@devoh/engine';
import { Field } from '../../../shared/ui';
import { slugId } from '../services/draft';
import { useCardMaker } from '../store/cardMakerStore';

const RARITY_HINT: Record<Rarity, string> = {
  comum: 'até 3 cópias',
  rara: 'até 3 cópias',
  super: 'até 2 cópias',
  ultra: '1 cópia',
  secreta: '1 cópia',
};

/** Nome, id (gerado do nome), raridade e "pessoa real da squad". */
export function IdentityFields() {
  const { input, record, records, edit } = useCardMaker();
  const locked = record?.serial != null;
  const id = record
    ? record.id
    : input.name.trim()
      ? slugId(
          input.name,
          records.map((r) => r.id),
        )
      : '—';

  return (
    <div className="cmk-fields">
      <Field label="Nome da carta" count={`${input.name.length}/40`}>
        {(fid) => (
          <input
            id={fid}
            value={input.name}
            maxLength={40}
            placeholder="Ex.: Estagiária Curiosa"
            onChange={(e) => edit((i) => ({ ...i, name: e.target.value }))}
          />
        )}
      </Field>
      <Field label="Identificador" hint="Gerado do nome. Não muda depois de criado.">
        {(fid) => <input id={fid} className="mono" value={id} readOnly />}
      </Field>
      <fieldset className="cmk-choice" disabled={locked}>
        <legend>Raridade</legend>
        <div className="cmk-chips">
          {RARITIES.map((r) => (
            <label key={r} className={`cmk-chip rarity-${r} ${input.rarity === r ? 'on' : ''}`}>
              <input type="radio" name="rarity" checked={input.rarity === r} onChange={() => edit((i) => ({ ...i, rarity: r }))} />
              {RARITY_INFO[r].label}
              <small>{RARITY_HINT[r]}</small>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="cmk-check">
        <input
          type="checkbox"
          checked={!!input.unique}
          disabled={locked}
          onChange={(e) => edit((i) => ({ ...i, unique: e.target.checked || undefined }))}
        />
        <span>
          <b>Pessoa real da squad</b>
          <small>Limita a 1 cópia por deck, como os cards do time.</small>
        </span>
      </label>
    </div>
  );
}
