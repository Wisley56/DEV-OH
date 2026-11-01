import { scoreCard, type CustomCardInput } from '@devoh/engine';
import { useMemo } from 'react';
import { Button } from '../../../shared/ui';
import { useCardMaker } from '../store/cardMakerStore';

const LOCKED: (keyof CustomCardInput)[] = ['atk', 'def', 'level', 'rarity', 'effects', 'kind', 'speed', 'trigger', 'bugType', 'target'];

/**
 * Medidor da tabela de balanceamento (a mesma conta que o servidor faz ao publicar):
 * pontos usados × orçamento, de onde vem cada ponto e até 3 ajustes para caber.
 */
export function BalanceMeter() {
  const { input, record, edit } = useCardMaker();
  const score = useMemo(() => scoreCard(input), [input]);
  // Publicada: as regras não mudam mais (sugestões mexeriam nelas).
  const locked = record?.serial != null;
  const pct = score.budget ? Math.min(100, (100 * score.used) / score.budget) : 0;

  return (
    <section className={`cmk-meter panel ${score.ok ? 'ok' : 'over'}`} aria-label="Balanceamento">
      <header>
        <h2>Balanceamento</h2>
        <span className="mono cmk-meter-total">
          {score.used} / {score.budget} pts
        </span>
      </header>
      <div
        className="cmk-meter-bar"
        role="meter"
        aria-label="Pontos usados do orçamento"
        aria-valuemin={0}
        aria-valuemax={score.budget}
        aria-valuenow={score.used}
      >
        <span style={{ width: `${pct}%` }} />
      </div>
      {score.atkCap !== undefined && (
        <p className="muted cmk-meter-hint">
          Teto de ATK no nível {input.level}: <b className="mono">{score.atkCap}</b>
        </p>
      )}
      {score.lines.length > 0 && (
        <ul className="cmk-meter-lines">
          {score.lines.map((l) => (
            <li key={l.label}>
              <span>{l.label}</span>
              <span className="mono">{l.pts}</span>
            </li>
          ))}
        </ul>
      )}
      {score.problems.length > 0 && (
        <ul className="cmk-meter-problems">
          {score.problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
      {!score.ok && !locked && score.suggestions.length > 0 && (
        <div className="cmk-suggestions">
          <p>Para caber no orçamento:</p>
          <ul>
            {score.suggestions.map((s) => (
              <li key={s.label}>
                <span>{s.label}</span>
                <Button size="sm" onClick={() => edit((i) => ({ ...i, ...pick(s.patch) }))} aria-label={`Aplicar: ${s.label}`}>
                  Aplicar
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {score.ok && <p className="cmk-meter-ok">Dentro do orçamento: pode publicar.</p>}
    </section>
  );
}

/** Só os campos de regra (o patch da sugestão nunca mexe em nome ou id). */
const pick = (patch: Partial<CustomCardInput>) =>
  Object.fromEntries(Object.entries(patch).filter(([k]) => LOCKED.includes(k as keyof CustomCardInput)));
