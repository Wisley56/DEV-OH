import { card, cardFrame, cardInfo, statAudit, statRow } from '@devoh/engine';
import { Button } from '../../../shared/ui';
import { CardFull } from '../../cards';

/** Carta em código, só para consulta: preview e a nota da curva de ATK/DEF. */
export function BaseCardView({ cardId, onClose }: { cardId: string; onClose(): void }) {
  const d = card(cardId);
  const info = cardInfo(cardId);
  const effect = cardFrame(d) === 'effect';
  const over = statAudit(d, effect);
  const row = d.kind === 'pro' ? statRow(d.level ?? 1) : null;

  return (
    <>
      <aside className="cmk-preview" aria-label="Pré-visualização">
        <section className="cmk-preview-card panel">
          <header className={`cmk-preview-head frame-${info.frame}`}>
            <h2>{d.name}</h2>
            <span className="cmk-ribbon cmk-ribbon-game">CARTA DO JOGO</span>
          </header>
          <div className="cmk-face">
            <CardFull cardId={cardId} />
          </div>
        </section>
      </aside>
      <section className="cmk-main cmk-base panel" aria-label="Detalhes da carta do jogo">
        <h2>{d.name}</h2>
        <p className="mono muted">
          {info.code} · {info.typeLine || info.subtype}
        </p>
        <p>Esta carta está em código (com efeitos escritos à mão) e não é editada aqui. Use como referência para criar uma nova.</p>
        {row && (
          <dl className="cmk-base-stats">
            <dt>ATK / DEF</dt>
            <dd className="mono">
              {d.atk} / {d.def}
            </dd>
            <dt>Curva do nível {d.level}</dt>
            <dd className="mono">
              soma {Math.round(row.sum * (effect ? 1 : 1.1))} · teto de ATK {row.atkCap}
            </dd>
            <dt>Situação</dt>
            <dd className={over.length ? 'warn' : 'ok'}>{over.length ? `Acima: ${over.join(', ')}` : 'Na curva'}</dd>
          </dl>
        )}
        <Button variant="ghost" onClick={onClose}>
          Voltar para o criador
        </Button>
      </section>
    </>
  );
}
