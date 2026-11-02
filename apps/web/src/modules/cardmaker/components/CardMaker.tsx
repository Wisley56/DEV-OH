import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button, CenterScreen, PageHead, Panel, Spinner, Trail } from '../../../shared/ui';
import { useCardMaker } from '../store/cardMakerStore';
import { BaseCardView } from './BaseCardView';
import { CardMakerForm } from './CardMakerForm';
import { CardPreviewPanel } from './CardPreviewPanel';
import { CustomCardList } from './CustomCardList';
import { PublishBar } from './PublishBar';

const STATUS_LINE = {
  new: 'Carta nova · ainda não salva',
  draft: 'Rascunho · só admins veem',
  published: 'Publicada · regras travadas',
  retired: 'Aposentada · fora da coleção',
} as const;

/**
 * Criador de cartas: preview + balanceamento, formulário e lista. A carta aberta vem da
 * rota (/admin/cartas/:id); "Cartas do jogo" abre uma carta em código só para consulta.
 */
export function CardMaker() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { status, loadError, load, open, record, dirty } = useCardMaker();
  const [baseId, setBaseId] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'idle') void load();
  }, [status, load]);
  useEffect(() => {
    if (status === 'ready') open(id ?? null);
  }, [status, id, open]);
  // Fechar ou recarregar a aba com mudanças não salvas pede confirmação.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  if (status === 'error')
    return (
      <CenterScreen>
        <Panel className="require-account">
          <h2>Não deu para abrir o criador</h2>
          <p>{loadError}</p>
          <div className="require-actions">
            <Button variant="primary" onClick={() => void load()}>
              Tentar de novo
            </Button>
          </div>
        </Panel>
      </CenterScreen>
    );
  if (status !== 'ready')
    return (
      <CenterScreen>
        <Spinner /> Carregando as cartas…
      </CenterScreen>
    );

  const state = record ? record.status : 'new';
  return (
    <div className="page cmk-page">
      <div className="cmk-head">
        <div>
          <Trail items={[{ label: '// admin', to: '/admin' }, { label: 'criador de cartas' }]} />
          <PageHead title="Criador de cartas" />
        </div>
        <p className="cmk-status">
          <span className={`cmk-dot cmk-dot-${state}`} aria-hidden />
          {baseId ? 'Carta do jogo · só consulta' : `${STATUS_LINE[state]}${dirty ? ' · mudanças não salvas' : ''}`}
        </p>
      </div>
      <div className="cmk-layout">
        {baseId ? (
          <BaseCardView cardId={baseId} onClose={() => setBaseId(null)} />
        ) : (
          <>
            <CardPreviewPanel />
            <div className="cmk-main">
              <CardMakerForm />
              <PublishBar />
            </div>
          </>
        )}
        <CustomCardList
          baseId={baseId}
          onOpenBase={setBaseId}
          onOpenCustom={(cardId) => {
            setBaseId(null);
            navigate(cardId ? `/admin/cartas/${cardId}` : '/admin/cartas');
          }}
        />
      </div>
    </div>
  );
}
