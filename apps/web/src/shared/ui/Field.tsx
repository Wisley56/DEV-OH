import { useId, type ReactNode } from 'react';

/** Campo de formulário com rótulo, dica e contador opcionais. */
export function Field({
  label,
  hint,
  count,
  className = '',
  children,
}: {
  label: string;
  hint?: ReactNode;
  count?: ReactNode;
  className?: string;
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div className={`field ${className}`.trim()}>
      <div className="field-head">
        <label htmlFor={id}>{label}</label>
        {count !== undefined && <span className="field-count">{count}</span>}
      </div>
      {children(id)}
      {hint && <p className="field-hint">{hint}</p>}
    </div>
  );
}

/** Número com − e + no passo dado, sempre dentro da faixa. */
export function NumberField({
  label,
  value,
  min,
  max,
  step,
  hint,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  hint?: ReactNode;
  disabled?: boolean;
  onChange(v: number): void;
}) {
  const set = (v: number) => onChange(Math.min(max, Math.max(min, Math.round(v / step) * step)));
  return (
    <Field label={label} hint={hint}>
      {(id) => (
        <div className="number-field">
          <button
            type="button"
            aria-label={`${label}: menos ${step}`}
            disabled={disabled || value <= min}
            onClick={() => set(value - step)}
          >
            −
          </button>
          <input
            id={id}
            type="number"
            inputMode="numeric"
            min={min}
            max={max}
            step={step}
            value={value}
            disabled={disabled}
            onChange={(e) => e.target.value !== '' && onChange(Number(e.target.value))}
            onBlur={(e) => set(Number(e.target.value) || 0)}
          />
          <button type="button" aria-label={`${label}: mais ${step}`} disabled={disabled || value >= max} onClick={() => set(value + step)}>
            +
          </button>
        </div>
      )}
    </Field>
  );
}
