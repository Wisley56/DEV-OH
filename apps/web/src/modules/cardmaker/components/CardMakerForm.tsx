import { useState } from 'react';
import { useCardMaker } from '../store/cardMakerStore';
import { ArtCropper } from './ArtCropper';
import { BlockBuilder } from './BlockBuilder';
import { IdentityFields } from './IdentityFields';
import { TextFields } from './TextFields';
import { TypeFields } from './TypeFields';

const TABS = [
  { id: 'identity', label: 'Identidade' },
  { id: 'type', label: 'Tipo e atributos' },
  { id: 'art', label: 'Arte' },
  { id: 'text', label: 'Texto e história' },
  { id: 'effects', label: 'Efeitos' },
] as const;

type Tab = (typeof TABS)[number]['id'];

/** Formulário em abas. Depois de publicada, os campos de regra ficam só para leitura. */
export function CardMakerForm() {
  const [tab, setTab] = useState<Tab>('identity');
  const locked = useCardMaker((s) => s.record?.serial != null);
  const missingArt = useCardMaker((s) => !s.pendingArt && !s.record?.artVersion);

  return (
    <section className="cmk-form panel" aria-label="Formulário da carta">
      <div className="tabs cmk-tabs" role="tablist" aria-label="Partes da carta">
        {TABS.map((t) => (
          <button
            key={t.id}
            id={`cmk-tab-${t.id}`}
            role="tab"
            aria-selected={tab === t.id}
            aria-controls={`cmk-panel-${t.id}`}
            className={`tab ${tab === t.id ? 'on' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            {t.id === 'art' && missingArt && <span className="cmk-tab-dot" title="Falta a arte" aria-hidden />}
          </button>
        ))}
      </div>
      {locked && (tab === 'type' || tab === 'effects') && (
        <p className="cmk-locked">
          Carta publicada: as regras estão travadas para nenhum duelo mudar no meio. Para mudar, use “Duplicar” na lista e aposente esta.
        </p>
      )}
      <div id={`cmk-panel-${tab}`} role="tabpanel" aria-labelledby={`cmk-tab-${tab}`} className="cmk-panel">
        {tab === 'identity' && <IdentityFields />}
        {tab === 'type' && <TypeFields locked={locked} />}
        {tab === 'art' && <ArtCropper />}
        {tab === 'text' && <TextFields />}
        {tab === 'effects' && <BlockBuilder locked={locked} />}
      </div>
    </section>
  );
}
