import { describeEffects, type CustomCardInput } from '@devoh/engine';
import { Field } from '../../../shared/ui';
import { useCardMaker } from '../store/cardMakerStore';

/** História (sempre), descrição (só Profissional Normal) e o texto do efeito, gerado dos blocos. */
export function TextFields() {
  const { input, edit } = useCardMaker();
  const hasEffects = !!input.effects?.length;
  const effectText = hasEffects ? safeDescribe(input) : '';

  return (
    <div className="cmk-fields">
      <Field
        label="História (aparece em itálico na carta)"
        count={`${(input.flavor ?? '').length}/200`}
        hint="A piada da carta, o lado cômico da squad."
      >
        {(id) => (
          <textarea
            id={id}
            rows={3}
            maxLength={200}
            value={input.flavor ?? ''}
            onChange={(e) => edit((i) => ({ ...i, flavor: e.target.value }))}
          />
        )}
      </Field>
      {input.kind === 'pro' && !hasEffects && (
        <Field label="Descrição (só para Profissional Normal, sem efeito)" count={`${(input.lore ?? '').length}/300`}>
          {(id) => (
            <textarea
              id={id}
              rows={3}
              maxLength={300}
              value={input.lore ?? ''}
              onChange={(e) => edit((i) => ({ ...i, lore: e.target.value }))}
            />
          )}
        </Field>
      )}
      {hasEffects && (
        <div className="field">
          <div className="field-head">
            <span className="field-label">Texto do efeito (gerado pelos blocos)</span>
          </div>
          <p className="cmk-effect-text">{effectText}</p>
          <p className="field-hint">Não dá para editar à mão: assim o texto sempre bate com o que a carta faz.</p>
        </div>
      )}
    </div>
  );
}

function safeDescribe(input: CustomCardInput) {
  try {
    return describeEffects(input);
  } catch {
    return 'Complete os blocos de efeito.';
  }
}
