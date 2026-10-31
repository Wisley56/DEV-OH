import { Ranking } from '../modules/ranking';
import { PageHead } from '../shared/ui';

export function RankingPage() {
  return (
    <div className="page ranking-page">
      <PageHead title="Ranking online" />
      <Ranking />
    </div>
  );
}
