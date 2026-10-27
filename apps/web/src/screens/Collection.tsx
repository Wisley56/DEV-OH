import { CARD_LIST, type CardKind } from '@devoh/game';
import { useState } from 'react';
import { CardFull } from '../components/Card';

const TABS: { id: CardKind | 'all'; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'pro', label: 'Profissionais' },
  { id: 'task', label: 'Tasks' },
  { id: 'bug', label: 'Bugs' },
];

export function Collection({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<CardKind | 'all'>('all');
  const list = CARD_LIST.filter((c) => tab === 'all' || c.kind === tab);
  return (
    <div className="page">
      <div className="page-head">
        <button className="btn btn-ghost" onClick={onBack}>
          ← Voltar
        </button>
        <h1>Coleção</h1>
        <div className="tabs">
          {TABS.map((t) => (
            <button key={t.id} className={`tab ${tab === t.id ? 'on' : ''}`} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="collection-grid">
        {list.map((c) => (
          <CardFull key={c.id} cardId={c.id} />
        ))}
      </div>
    </div>
  );
}
