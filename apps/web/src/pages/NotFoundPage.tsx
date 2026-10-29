import { Link } from 'react-router';
import { CenterScreen, Panel } from '../shared/ui';

export function NotFoundPage() {
  return (
    <CenterScreen>
      <Panel>
        <h2>404 — Página não encontrada</h2>
        <p>Essa rota foi pro backlog.</p>
        <Link className="btn btn-primary" to="/">
          Voltar ao início
        </Link>
      </Panel>
    </CenterScreen>
  );
}
