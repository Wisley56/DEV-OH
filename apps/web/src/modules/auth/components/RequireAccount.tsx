import type { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Button, CenterScreen, Panel, Spinner } from '../../../shared/ui';
import { useAccount } from '../store/authStore';

/** Página de login que volta para `next` depois de entrar. */
export const loginPath = (next: string) => `/entrar?next=${encodeURIComponent(next)}`;

/** Só mostra o conteúdo para quem está logado; visitante vê o convite para entrar. */
export function RequireAccount({ reason, children }: { reason: string; children: ReactNode }) {
  const { status } = useAccount();
  const navigate = useNavigate();
  const here = useLocation();
  if (status === 'unknown')
    return (
      <CenterScreen>
        <Spinner /> Carregando…
      </CenterScreen>
    );
  if (status === 'user') return children;
  return (
    <CenterScreen>
      <Panel className="require-account">
        <h2>Entre na sua conta</h2>
        <p>{reason}</p>
        <div className="require-actions">
          <Button variant="primary" onClick={() => navigate(loginPath(here.pathname + here.search))}>
            Entrar / criar conta
          </Button>
          <Button variant="ghost" onClick={() => navigate('/')}>
            Voltar ao início
          </Button>
        </div>
      </Panel>
    </CenterScreen>
  );
}
