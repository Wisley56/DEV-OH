import { useState } from 'react';
import { Button } from '../../../shared/ui';
import { useDeckLibrary } from '../store/deckLibraryStore';

/** No 1º login: oferece levar para a conta os decks que estavam só neste navegador. */
export function ImportLocalDecks() {
  const pending = useDeckLibrary((s) => s.pendingImport);
  const { importLocal, discardLocal } = useDeckLibrary.getState();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!pending.length) return null;

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      await importLocal();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="import-decks" role="dialog" aria-label="Importar decks">
      <p>
        Achei <b>{pending.length}</b> {pending.length === 1 ? 'deck salvo' : 'decks salvos'} neste navegador (
        {pending.map((d) => d.name).join(', ')}). Levar para a sua conta?
      </p>
      {error && <p className="warn">{error}</p>}
      <div className="import-actions">
        <Button variant="primary" size="sm" disabled={busy} onClick={run}>
          {busy ? 'Importando…' : 'Importar para a conta'}
        </Button>
        <Button variant="ghost" size="sm" disabled={busy} onClick={discardLocal}>
          Descartar
        </Button>
      </div>
    </div>
  );
}
