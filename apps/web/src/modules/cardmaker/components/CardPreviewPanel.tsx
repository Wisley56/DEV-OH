import { useMemo } from 'react';
import { CardFace } from '../../cards';
import { adminArtUrl } from '../services/cardmakerApi';
import { draftFace } from '../services/draft';
import { useCardMaker } from '../store/cardMakerStore';
import { BalanceMeter } from './BalanceMeter';

const RIBBON = { new: 'NOVA', draft: 'RASCUNHO', published: 'PUBLICADA', retired: 'APOSENTADA' } as const;

/** Coluna da esquerda: a carta como vai ficar, o texto gerado e o medidor da tabela. */
export function CardPreviewPanel() {
  const { input, record, previewArt } = useCardMaker();
  const art = previewArt ?? (record?.artVersion ? adminArtUrl(record.id, record.artVersion) : null);
  const face = useMemo(() => draftFace(input, art, record?.serial ?? null), [input, art, record?.serial]);
  const state = record ? record.status : 'new';

  return (
    <aside className="cmk-preview" aria-label="Pré-visualização">
      <section className="cmk-preview-card panel">
        <header className={`cmk-preview-head frame-${face.info.frame}`}>
          <h2>{face.def.name}</h2>
          <span className={`cmk-ribbon cmk-ribbon-${state}`}>{RIBBON[state]}</span>
        </header>
        <div className="cmk-face">
          <CardFace card={face.def} info={face.info} />
          {!art && <p className="cmk-no-art">Sem arte ainda (obrigatória para publicar)</p>}
        </div>
      </section>
      <BalanceMeter />
    </aside>
  );
}
