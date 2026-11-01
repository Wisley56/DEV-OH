import { useState } from 'react';
import { readJson, STORAGE_KEYS, writeJson } from '../../../shared/lib/storage';

/** Preferência "mostrar decks iniciais" da lista de decks, guardada neste navegador. */
export function useShowStarterDecks(): [boolean, (on: boolean) => void] {
  const [show, setShow] = useState(() => readJson(STORAGE_KEYS.showStarterDecks, true));
  return [
    show,
    (on) => {
      writeJson(STORAGE_KEYS.showStarterDecks, on);
      setShow(on);
    },
  ];
}
