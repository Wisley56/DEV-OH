import { createBrowserRouter } from 'react-router';
import { CenterScreen, Spinner } from '../shared/ui';
import { HomePage } from '../pages/HomePage';
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
 * Convite: /sala/CODIGO (sem sessão na aba, abre o lobby em /?sala=CODIGO).
 * O servidor estático precisa devolver o index.html para qualquer rota (serve -s).
 */
export const router = createBrowserRouter([
  {
    errorElement: <RouteError />,
    HydrateFallback: RouteLoading,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/colecao', lazy: () => import('../pages/CollectionPage').then((m) => ({ Component: m.CollectionPage })) },
      { path: '/decks', lazy: () => import('../pages/DeckBuilderPage').then((m) => ({ Component: m.DeckBuilderPage })) },
      { path: '/treino', lazy: () => import('../pages/TrainingPage').then((m) => ({ Component: m.TrainingPage })) },
      { path: '/sala/:code', lazy: () => import('../pages/RoomPage').then((m) => ({ Component: m.RoomPage })) },
      { path: '*', lazy: () => import('../pages/NotFoundPage').then((m) => ({ Component: m.NotFoundPage })) },
    ],
  },
]);
