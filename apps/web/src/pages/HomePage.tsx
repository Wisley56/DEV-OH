import { LobbyPanel, RulesSummary } from '../modules/lobby';

export function HomePage() {
  return (
    <div className="home">
      <LobbyPanel />
      <RulesSummary />
    </div>
  );
}
