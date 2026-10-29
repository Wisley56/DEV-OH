import { CARD_LIST, type CardKind } from '@devoh/engine';
import { useState } from 'react';
import { PageHead } from '../../../shared/ui';
import { CardFull } from '../../cards';

type Filter = CardKind | 'all';

const TABS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'pro', label: 'Profissionais' },
  { id: 'task', label: 'Tasks' },
  { id: 'bug', label: 'Bugs' },
];

/** Todos os cards do jogo, com filtro por tipo. */
export function CardCollection() {
  const [tab, setTab] = useState<Filter>('all');
  const list = CARD_LIST.filter((c) => tab === 'all' || c.kind === tab);
  return (
    <>
      <PageHead title="Coleção">
        <div className="tabs">
          {TABS.map((t) => (
            <button key={t.id} className={`tab ${tab === t.id ? 'on' : ''}`} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
      </PageHead>
      <div className="collection-grid">
        {list.map((c) => (
          <CardFull key={c.id} cardId={c.id} />
        ))}
      </div>
    </>
  );
}
