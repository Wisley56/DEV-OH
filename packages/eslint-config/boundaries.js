/**
 * Fronteiras entre camadas do DEV-OH!, verificadas pelo lint (no-restricted-imports).
 * Cada bloco diz o que uma camada NÃO pode importar.
 */

const restrict = (files, patterns, paths = []) => ({
  files,
  ignores: ['**/*.test.ts', '**/*.test.tsx'],
  rules: { 'no-restricted-imports': ['error', { patterns, paths }] },
});

/** Num flat config a última configuração da regra vence; por isso esta entra também no bloco de services. */
const MODULE_API = {
  group: [
    '../../*/components/**',
    '../../*/store/**',
    '../../*/services/**',
    '../../*/hooks/**',
    '../../*/ports',
    '**/pages/**',
    '**/app/**',
  ],
  message: 'Outro módulo só pela API pública (modules/<nome>/index.ts); módulos não importam páginas nem app.',
};

const REACT_ROUTER_HOOKS = ['useParams', 'useNavigate', 'useLocation', 'useSearchParams', 'useLoaderData', 'useRouteError'];

export default [
  // ── Engine: o kernel de regras não conhece o conteúdo; o conteúdo só usa a API de efeitos.
  restrict(
    ['packages/engine/src/{core,rules,effects,view}/**/*.ts'],
    [
      {
        group: ['**/content', '**/content/**'],
        message: 'O kernel (core/rules/effects/view) não importa o conteúdo: use a porta CardCatalog.',
      },
    ],
  ),
  restrict(
    ['packages/engine/src/content/**/*.ts'],
    [
      {
        group: ['**/rules/**', '**/core/board', '**/core/rng', '**/core/log'],
        message: 'Cards importam só de effects/api (e tipos de core/types).',
      },
    ],
  ),

  // ── Servidor: domínio sem framework; aplicação sem transporte.
  restrict(
    ['apps/server/src/modules/*/domain/**/*.ts'],
    [
      {
        group: ['@nestjs/*', 'socket.io', '**/application/**', '**/infrastructure/**', '**/presentation/**'],
        message: 'O domínio não depende de Nest, Socket.IO nem de outras camadas.',
      },
    ],
  ),
  restrict(
    ['apps/server/src/modules/*/application/**/*.ts'],
    [
      {
        group: ['socket.io', '**/infrastructure/**', '**/presentation/**'],
        message: 'A aplicação fala com o mundo só por portas (ports.ts).',
      },
    ],
  ),

  // ── Front: páginas burras.
  restrict(
    ['apps/web/src/pages/**/*.tsx'],
    [
      { group: ['@devoh/*'], message: 'Página burra: regras do jogo ficam nos componentes dos módulos.' },
      { group: ['**/modules/*/*', '**/modules/*/*/**'], message: 'Página importa só a API pública do módulo (modules/<nome>).' },
      { group: ['**/shared/lib/**', 'zustand', 'socket.io-client'], message: 'Página burra: sem estado, storage ou rede.' },
    ],
    [
      { name: 'react', message: 'Página burra: sem hooks/estado. Coloque a lógica num componente do módulo.' },
      { name: 'react-router', importNames: REACT_ROUTER_HOOKS, message: 'Página burra: quem lê a rota é o componente do módulo.' },
    ],
  ),

  // ── Front: módulos só se enxergam pela API pública.
  restrict(['apps/web/src/modules/**/*.{ts,tsx}'], [MODULE_API]),

  // ── Front: services são TypeScript puro (testáveis sem React).
  restrict(
    ['apps/web/src/modules/*/services/**/*.ts'],
    [
      MODULE_API,
      {
        group: ['react', 'react-dom', 'react-router', 'zustand', 'framer-motion', '**/components/**', '**/store/**', '**/hooks/**'],
        message: 'services/ não depende de React, stores nem componentes.',
      },
    ],
  ),

  // ── Front: shared é a base; não conhece features.
  restrict(
    ['apps/web/src/shared/**/*.{ts,tsx}'],
    [
      {
        group: ['**/modules/**', '**/pages/**', '**/app/**', '@devoh/*'],
        message: 'shared/ é genérico: não importa módulos, páginas nem o jogo.',
      },
    ],
  ),
];
