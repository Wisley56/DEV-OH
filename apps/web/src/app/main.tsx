import { LazyMotion } from 'framer-motion';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { router } from './router';
// Fontes servidas pelo próprio site (licença OFL): sem requisição ao Google e CSP só com 'self'.
import '@fontsource/cinzel/600.css';
import '@fontsource/cinzel/700.css';
import '@fontsource/cinzel/900.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/inter/800.css';
import './styles/index.css';

// Os componentes usam <m.*>: o motor de animação chega num chunk separado, fora do carregamento inicial.
const motionFeatures = () => import('./motion-features').then((r) => r.default);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LazyMotion features={motionFeatures} strict>
      <RouterProvider router={router} />
    </LazyMotion>
  </StrictMode>,
);
