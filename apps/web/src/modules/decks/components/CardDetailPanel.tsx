import { Minus, Plus, Shield, Star, Swords } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Button } from '../../../shared/ui';
import { AttrBadge, CardFull } from '../../cards';
import { useMoveCard } from '../hooks/useMoveCard';
import { cardDetails } from '../services/cardDetails';
import { canAdd } from '../services/deckEditing';
import { useDeckBuilder } from '../store/deckBuilderStore';
import { CardZoom } from './CardZoom';

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <div className="db-stat" title={label}>
      <dt>
        {icon}
        <span className="sr-only">{label}</span>
      </dt>
      <dd>{value}</dd>
    </div>
  );
}

/**
 * Painel da esquerda: a carta em miniatura (só ilustrativa) e, em texto legível, nome, nível,
 * ATK/DEF, tipo, efeito e regras; embaixo, quantas cópias estão no deck e +1/−1.
 */
export function CardDetailPanel() {
  const preview = useDeckBuilder((s) => s.preview);
  const cards = useDeckBuilder((s) => s.editing.cards);
  const move = useMoveCard();
  const [zoom, setZoom] = useState(false);

  if (!preview) {
    return (
      <aside className="db-detail panel" aria-label="Detalhes do card">
        <p className="muted db-detail-empty">Clique em um card para ver os detalhes.</p>
      </aside>
    );
  }

  const info = cardDetails(preview);
  const d = info.def;
  const n = cards.filter((x) => x === preview).length;

  return (
    <aside className="db-detail panel" aria-label="Detalhes do card">
      <header className={`db-detail-head kind-${d.kind}`}>
        <h2>{d.name}</h2>
        <AttrBadge def={d} />
      </header>

      <div className="db-detail-body">
        <div className="db-detail-top">
          <button
            type="button"
            className="db-detail-card"
            aria-label={`Ampliar ${d.name}`}
            title="Clique para ampliar"
            onClick={() => setZoom(true)}
          >
            <CardFull cardId={preview} />
          </button>
          <dl className="db-detail-stats">
            {info.stats ? (
              <>
                <Stat icon={<Star size={18} aria-hidden />} label="Nível" value={info.stats.level} />
                <Stat icon={<Swords size={18} aria-hidden />} label="ATK" value={info.stats.atk} />
                <Stat icon={<Shield size={18} aria-hidden />} label="DEF" value={info.stats.def} />
              </>
            ) : (
              <div className={`db-detail-kind kind-${d.kind}`}>
                <dt className="sr-only">Tipo</dt>
                <dd>{info.subtype}</dd>
              </div>
            )}
            <div className="db-detail-rarity">
              <dt className="sr-only">Raridade</dt>
              <dd>
                <span className={`db-rarity rarity-${d.rarity}`}>{info.rarity}</span>
                <span className="mono muted">{info.code}</span>
              </dd>
            </div>
          </dl>
        </div>

        {/* Em Task/Bug sem rótulo extra a linha de tipo só repetiria o selo ao lado da carta. */}
        {(info.stats || info.typeLine !== info.subtype) && <p className="db-detail-type">[{info.typeLine}]</p>}
        <p className="db-detail-text">{d.text}</p>
        {d.flavor && <p className="db-detail-flavor">{d.flavor}</p>}

        {info.rules.length > 0 && (
          <dl className="db-detail-rules">
            {info.rules.map((r) => (
              <div key={r.label}>
                <dt>{r.label}</dt>
                <dd>{r.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      <footer className="db-detail-foot">
        <p className="db-detail-count">
          No deck: <b className="mono">{n}</b> / {info.maxCopies}
          <span className="muted"> · máx. {info.maxCopies === 1 ? '1 cópia' : `${info.maxCopies} cópias`}</span>
        </p>
        <div className="db-detail-actions">
          <Button
            disabled={!canAdd(cards, preview)}
            onClick={(e) => move(preview, 'add', e.currentTarget.closest('.db-detail')?.querySelector('.db-detail-card'))}
            aria-label={`Pôr ${d.name} no deck`}
          >
            <Plus size={16} aria-hidden /> 1
          </Button>
          <Button disabled={n === 0} onClick={() => move(preview, 'remove')} aria-label={`Tirar ${d.name} do deck`}>
            <Minus size={16} aria-hidden /> 1
          </Button>
        </div>
      </footer>

      {zoom && <CardZoom cardId={preview} onClose={() => setZoom(false)} />}
    </aside>
  );
}
