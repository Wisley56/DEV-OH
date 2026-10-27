import { useState } from 'react';
import { Collection } from './screens/Collection';
import { DeckBuilder } from './screens/DeckBuilder';
import { Home } from './screens/Home';
import { LocalDuel } from './screens/LocalDuel';
import { OnlineDuel } from './screens/OnlineDuel';
import type { OnlineIntent } from './net';

export type Screen =
  | { name: 'home' }
  | { name: 'collection' }
  | { name: 'decks' }
  | { name: 'bot'; deck: string[]; playerName: string }
  | { name: 'online'; intent: OnlineIntent };

export function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'home' });
  const home = () => {
    history.replaceState(null, '', location.pathname);
    setScreen({ name: 'home' });
  };
  switch (screen.name) {
    case 'collection':
      return <Collection onBack={home} />;
    case 'decks':
      return <DeckBuilder onBack={home} />;
    case 'bot':
      return <LocalDuel deck={screen.deck} playerName={screen.playerName} onExit={home} />;
    case 'online':
      return <OnlineDuel intent={screen.intent} onExit={home} />;
    default:
      return <Home go={setScreen} />;
  }
}
