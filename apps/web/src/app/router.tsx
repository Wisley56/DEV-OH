import { createBrowserRouter } from 'react-router';
import { CollectionPage } from '../pages/CollectionPage';
import { DeckBuilderPage } from '../pages/DeckBuilderPage';
import { HomePage } from '../pages/HomePage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { RoomPage } from '../pages/RoomPage';
import { TrainingPage } from '../pages/TrainingPage';
import { RouteError } from './RouteError';

/**
 * Rotas do jogo. Convite: /sala/CODIGO (sem sessão na aba, abre o lobby em /?sala=CODIGO).
 * O servidor estático precisa devolver o index.html para qualquer rota (serve -s).
 */
export const router = createBrowserRouter([
  {
    errorElement: <RouteError />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/colecao', element: <CollectionPage /> },
      { path: '/decks', element: <DeckBuilderPage /> },
      { path: '/treino', element: <TrainingPage /> },
      { path: '/sala/:code', element: <RoomPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
