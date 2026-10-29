import { useCallback, useState } from 'react';
import { readJson, STORAGE_KEYS, writeJson } from '../../../shared/lib/storage';

/** Tour aberto na primeira vez (fica salvo que já viu) e reaberto quando pedirem. */
export function useTour() {
  const [open, setOpen] = useState(() => !readJson(STORAGE_KEYS.tutorialSeen, false));
  const close = useCallback(() => {
    writeJson(STORAGE_KEYS.tutorialSeen, true);
    setOpen(false);
  }, []);
  const show = useCallback(() => setOpen(true), []);
  return { open, show, close };
}
