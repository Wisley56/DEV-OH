import { scoreCard, validateCustomInput } from '@devoh/engine';
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button, ConfirmDialog } from '../../../shared/ui';
import type { CustomCardRecord } from '@devoh/protocol';
import { useCardMaker } from '../store/cardMakerStore';
import { SimulatorDrawer } from './SimulatorDrawer';

type Dialog = 'publish' | 'retire' | 'delete' | null;

/** Salvar, publicar, aposentar e apagar, cada ação importante com confirmação. */
export function PublishBar() {
  const { input, record, dirty, pendingArt, busy, notice, dismissNotice, save, publish, retire, restore, remove } = useCardMaker();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [simulating, setSimulating] = useState(false);
  const navigate = useNavigate();
  const { id } = useParams();
  const status = record?.status ?? 'draft';

  // O que ainda impede de publicar (o servidor confere de novo).
  const reason = useMemo(() => {
    const probe = { ...input, id: input.id || 'x_rascunho' };
    const errors = validateCustomInput(probe);
    if (errors.length) return errors[0]!;
    const score = scoreCard(probe, false);
    if (!score.ok) return score.problems[0] ?? 'Fora da tabela de balanceamento.';
    if (!pendingArt && !record?.artVersion) return 'Envie a arte da carta (aba Arte).';
    return null;
  }, [input, pendingArt, record?.artVersion]);

  /** Depois de salvar uma carta nova, a URL passa a ser a dela. */
  const follow = (rec: CustomCardRecord | null | undefined) => {
    if (rec && rec.id !== id) navigate(`/admin/cartas/${rec.id}`, { replace: true });
  };
  const doSave = async () => follow(await save());
  const doPublish = async () => {
    setDialog(null);
    await publish();
    follow(useCardMaker.getState().record);
  };

  return (
    <div className="cmk-publish panel">
      {notice && (
        <div className={`cmk-notice ${notice.kind}`} role={notice.kind === 'error' ? 'alert' : 'status'}>
          <p>{notice.text}</p>
          {notice.problems && (
            <ul>
              {notice.problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          )}
          <button type="button" className="link-btn" onClick={dismissNotice}>
            Fechar
          </button>
        </div>
      )}
      <div className="cmk-publish-actions">
        <Button disabled={busy !== null || (!!record && !dirty && !pendingArt)} onClick={() => void doSave()}>
          {busy === 'save' ? 'Salvando…' : busy === 'art' ? 'Enviando a arte…' : status === 'draft' ? 'Salvar rascunho' : 'Salvar'}
        </Button>
        <Button variant="ghost" disabled={busy !== null} onClick={() => setSimulating(true)}>
          Testar no simulador
        </Button>
        {status === 'draft' && record && (
          <Button variant="ghost" disabled={busy !== null} onClick={() => setDialog('delete')}>
            Apagar rascunho
          </Button>
        )}
        <span className="cmk-publish-spacer" />
        {status === 'draft' && (
          <>
            {reason && <span className="cmk-publish-reason">{reason}</span>}
            <Button variant="primary" disabled={!!reason || busy !== null} onClick={() => setDialog('publish')}>
              {busy === 'publish' ? 'Publicando…' : 'Publicar para todos'}
            </Button>
          </>
        )}
        {status === 'published' && (
          <Button variant="battle" disabled={busy !== null || dirty} onClick={() => setDialog('retire')}>
            Aposentar
          </Button>
        )}
        {status === 'retired' && (
          <Button variant="primary" disabled={busy !== null || dirty} onClick={() => void restore()}>
            {busy === 'restore' ? 'Restaurando…' : 'Voltar para a coleção'}
          </Button>
        )}
      </div>

      {dialog === 'publish' && (
        <ConfirmDialog
          title={`Publicar "${input.name}"?`}
          confirmLabel="Publicar para todos"
          onCancel={() => setDialog(null)}
          onConfirm={() => void doPublish()}
        >
          <p>A carta entra na coleção e no deck builder de todo mundo, sem deploy.</p>
          <p>
            Depois de publicada, as regras ficam travadas: só nome, linha de tipo, textos e arte mudam. Para mudar as regras, duplique e
            aposente esta.
          </p>
        </ConfirmDialog>
      )}
      {dialog === 'retire' && (
        <ConfirmDialog
          title={`Aposentar "${input.name}"?`}
          confirmLabel="Aposentar"
          danger
          onCancel={() => setDialog(null)}
          onConfirm={() => {
            setDialog(null);
            void retire();
          }}
        >
          <p>Ela sai da coleção e não entra em decks novos. Duelos em andamento e decks antigos continuam desenhando a carta.</p>
        </ConfirmDialog>
      )}
      {dialog === 'delete' && (
        <ConfirmDialog
          title={`Apagar o rascunho "${input.name}"?`}
          confirmLabel="Apagar"
          danger
          onCancel={() => setDialog(null)}
          onConfirm={async () => {
            setDialog(null);
            if (await remove()) navigate('/admin/cartas', { replace: true });
          }}
        >
          <p>O rascunho e a arte dele somem de vez. Isso não dá para desfazer.</p>
        </ConfirmDialog>
      )}
      {simulating && <SimulatorDrawer onClose={() => setSimulating(false)} />}
    </div>
  );
}
