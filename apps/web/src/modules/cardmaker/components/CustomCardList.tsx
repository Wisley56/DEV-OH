import { BASE_CARD_LIST, cardFrame, scoreCard, statAudit, type CardDef, type CustomStatus } from '@devoh/engine';
import { Copy, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '../../../shared/ui';
import { useCardMaker } from '../store/cardMakerStore';

type ListTab = CustomStatus | 'game';

const TABS: { id: ListTab; label: string }[] = [
  { id: 'draft', label: 'Rascunhos' },
  { id: 'published', label: 'Publicadas' },
  { id: 'retired', label: 'Aposentadas' },
  { id: 'game', label: 'Cartas do jogo' },
];

const KIND = { pro: 'Profissional', task: 'Task', bug: 'Bug' } as const;

const metaOf = (d: Pick<CardDef, 'kind' | 'level' | 'atk' | 'def' | 'rarity'>) =>
  d.kind === 'pro' ? `⭐${d.level} · ${d.atk}/${d.def} · ${d.rarity}` : `${KIND[d.kind]} · ${d.rarity}`;

/** Coluna da direita: cartas do painel por status, e as do jogo (em código) só para comparar. */
export function CustomCardList({
  baseId,
  onOpenBase,
  onOpenCustom,
}: {
  baseId: string | null;
  onOpenBase(id: string): void;
  onOpenCustom(id: string | null): void;
}) {
  const { records, record, startNew, duplicate } = useCardMaker();
  const [tab, setTab] = useState<ListTab>(record?.status ?? 'draft');
  const counts = useMemo(() => {
    const c: Record<ListTab, number> = { draft: 0, published: 0, retired: 0, game: BASE_CARD_LIST.length };
    for (const r of records) c[r.status]++;
    return c;
  }, [records]);

  return (
    <aside className="cmk-list panel" aria-label="Cartas">
      <header>
        <h2>Cartas</h2>
        <Button
          size="sm"
          variant="primary"
          onClick={() => {
            startNew();
            onOpenCustom(null);
          }}
        >
          <Plus size={16} aria-hidden /> Nova carta
        </Button>
      </header>
      <div className="tabs cmk-list-tabs" role="tablist" aria-label="Mostrar">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={`tab ${tab === t.id ? 'on' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label} <span className="mono">{counts[t.id]}</span>
          </button>
        ))}
      </div>
      {tab === 'game' ? (
        <>
          <p className="muted cmk-list-note">
            As {BASE_CARD_LIST.length} cartas originais ficam em código. Aqui é só consulta, para comparar.
          </p>
          <ul className="cmk-items">
            {BASE_CARD_LIST.map((d) => {
              const over = statAudit(d, cardFrame(d) === 'effect');
              return (
                <li key={d.id}>
                  <button type="button" className={`cmk-item ${baseId === d.id ? 'on' : ''}`} onClick={() => onOpenBase(d.id)}>
                    <b>{d.name}</b>
                    <small>{metaOf(d)}</small>
                    <span className={`cmk-score ${over.length ? 'over' : 'ok'}`}>{over.length ? over.join(', ') : 'na curva'}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <ul className="cmk-items">
          {records
            .filter((r) => r.status === tab)
            .map((r) => {
              const score = scoreCard(r.input, false);
              return (
                <li key={r.id} className="cmk-item-row">
                  <button
                    type="button"
                    className={`cmk-item ${!baseId && record?.id === r.id ? 'on' : ''}`}
                    onClick={() => onOpenCustom(r.id)}
                  >
                    <b>{r.input.name}</b>
                    <small>{metaOf(r.input)}</small>
                    <span className={`cmk-score ${score.ok ? 'ok' : 'over'}`}>
                      {score.used}/{score.budget} pts
                    </span>
                  </button>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`Duplicar ${r.input.name}`}
                    title="Duplicar"
                    onClick={() => {
                      duplicate(r.id);
                      onOpenCustom(null);
                    }}
                  >
                    <Copy size={16} aria-hidden />
                  </Button>
                </li>
              );
            })}
          {counts[tab] === 0 && (
            <li className="cmk-empty">
              <b>{tab === 'draft' ? 'Nenhum rascunho ainda' : tab === 'published' ? 'Nenhuma carta publicada' : 'Nenhuma aposentada'}</b>
              {tab === 'draft' && <p>Comece com “Nova carta” ou duplique uma carta publicada para usar de base.</p>}
            </li>
          )}
        </ul>
      )}
    </aside>
  );
}
