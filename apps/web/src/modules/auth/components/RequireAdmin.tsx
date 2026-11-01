import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { Button, CenterScreen, Panel } from '../../../shared/ui';
import { useAccount } from '../store/authStore';

/**
 * Só mostra o conteúdo para conta admin (use dentro do RequireAccount). Esconder a tela é
 * conveniência: o servidor barra cada rota /api/admin com 403 de qualquer jeito.
 */
export function RequireAdmin({ what, children }: { what: string; children: ReactNode }) {
  const { account } = useAccount();
  const navigate = useNavigate();
  if (account?.isAdmin) return children;
  return (
    <CenterScreen>
      <Panel className="require-account">
        <h2>Acesso restrito</h2>
        <p>{what} é só para administradores. Se você acha que devia ter acesso, fale com quem cuida do jogo.</p>
        <div className="require-actions">
          <Button variant="ghost" onClick={() => navigate('/')}>
            Voltar ao lobby
          </Button>
        </div>
      </Panel>
    </CenterScreen>
  );
}
