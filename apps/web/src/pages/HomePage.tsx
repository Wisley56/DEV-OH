import { AdminShortcut } from '../modules/auth';
import { LobbyPanel, RulesSummary } from '../modules/lobby';

export function HomePage() {
  return (
    <div className="home">
      <AdminShortcut />
      <LobbyPanel />
      <RulesSummary />
    </div>
  );
}
