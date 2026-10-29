import { HeroShowcase, LobbyPanel, RulesSummary } from '../modules/lobby';

export function HomePage() {
  return (
    <div className="home">
      <HeroShowcase />
      <LobbyPanel />
      <RulesSummary />
    </div>
  );
}
