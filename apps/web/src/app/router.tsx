import { createBrowserRouter } from 'react-router';
import { CenterScreen, Spinner } from '../shared/ui';
import { HomePage } from '../pages/HomePage';
import { MenuLayout } from './MenuLayout';
import { RouteError } from './RouteError';

/** Tela enquanto o código de uma rota é baixado. */
function RouteLoading() {
  return (
    <CenterScreen>
      <Spinner /> Carregando…
    </CenterScreen>
  );
}

/**
 * Rotas do jogo. A home vem no pacote inicial; as outras são baixadas sob demanda
 * (o treino traz os bots, a sala traz o Socket.IO).
 * Convite: /sala/CODIGO (se a conta não estiver na sala, abre o lobby em /?sala=CODIGO).
 * Conta: /entrar?next=… (online e deck builder pedem login; treino, coleção e ranking não).
 * As telas de menu ficam dentro do MenuLayout (barra superior e fundo de pixels); treino e sala não.
 * O servidor do web (server.mjs) devolve o index.html para qualquer rota.
 */
export const router = createBrowserRouter([
  {
    errorElement: <RouteError />,
    HydrateFallback: RouteLoading,
    children: [
      {
        element: <MenuLayout />,
        children: [
          { path: '/', element: <HomePage /> },
          { path: '/colecao', lazy: () => import('../pages/CollectionPage').then((m) => ({ Component: m.CollectionPage })) },
          { path: '/decks', lazy: () => import('../pages/DeckBuilderPage').then((m) => ({ Component: m.DeckBuilderPage })) },
          { path: '/entrar', lazy: () => import('../pages/LoginPage').then((m) => ({ Component: m.LoginPage })) },
          { path: '/ranking', lazy: () => import('../pages/RankingPage').then((m) => ({ Component: m.RankingPage })) },
          { path: '*', lazy: () => import('../pages/NotFoundPage').then((m) => ({ Component: m.NotFoundPage })) },
        ],
      },
      { path: '/treino', lazy: () => import('../pages/TrainingPage').then((m) => ({ Component: m.TrainingPage })) },
      { path: '/sala/:code', lazy: () => import('../pages/RoomPage').then((m) => ({ Component: m.RoomPage })) },
    ],
  },
]);
