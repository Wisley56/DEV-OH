# DEV-OH! — Guia do desenvolvedor

Como rodar, como o código está organizado, como criar cards e módulos e como publicar. A apresentação do jogo está no [README](README.md), as decisões de arquitetura em [docs/adr](docs/adr) e as proteções e limites em [SECURITY.md](SECURITY.md).

## Rodar local

Requer Node 22.22+ (veja `.nvmrc`).

```bash
npm install
npm run dev        # servidor (porta 3001) + web (porta 5173); o engine é lido do código-fonte, sem rebuild
```

Abra http://localhost:5173. Para testar o online, crie uma sala numa aba e abra o link de convite em outra.

Nenhuma variável de ambiente é obrigatória em dev. Para mudar alguma, copie `apps/server/.env.example` ou `apps/web/.env.example` para `.env` na mesma pasta: o server lê o arquivo com `--env-file-if-exists` e o Vite lê o dele sozinho. Os `.env` são ignorados pelo git.

```bash
npm test           # engine, bots (inclui o golden de paridade), servidor (unit + e2e) e web
npm run lint       # ESLint, incluindo as fronteiras entre camadas
npm run typecheck
npm run format     # Prettier
npm run build:all  # build de todos os workspaces (o CI roda tudo isso)
npm run crop-art   # regera as artes a partir de assets/source
```

## Arquitetura

Monorepo com npm workspaces + Turborepo. Cada pacote tem uma responsabilidade e as dependências só vão num sentido:

```
            ┌───────────────┐
            │ @devoh/engine │  regras puras e determinísticas + catálogo de cards
            └──────┬────────┘
        ┌──────────┼──────────────┐
┌───────▼──────┐ ┌─▼──────────────┐ │
│  @devoh/ai   │ │ @devoh/protocol│ │   bots · contrato de rede (tipos + schemas zod)
└───────┬──────┘ └─┬────────────┬─┘ │
        │          │            │   │
   ┌────▼──────────▼──┐     ┌───▼───▼──────┐
   │    apps/web      │     │  apps/server │
   │ React + Vite 8   │     │ NestJS 12    │
   └──────────────────┘     └──────────────┘
```

| Pasta                                         | O quê                                                                                             |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `packages/engine`                             | Regras do duelo. Sem I/O, sem React, sem Node: roda no navegador (treino) e no servidor (online). |
| `packages/ai`                                 | Bots "Com IA" (heurístico) e "Sem IA" (simula cada jogada).                                       |
| `packages/protocol`                           | Eventos do Socket.IO, payloads, `RoomState` e schemas zod (`@devoh/protocol/schemas`).            |
| `packages/tsconfig`, `packages/eslint-config` | Presets compartilhados (TS, lint e fronteiras entre camadas).                                     |
| `apps/server`                                 | NestJS + Socket.IO: salas, servidor autoritativo, esconde a mão do oponente, reconexão.           |
| `apps/web`                                    | React 19 + Vite 8 + React Router + Zustand.                                                       |

Os pacotes expõem o código-fonte na condição `source` (usada pelo Vite e pelo `tsx` em dev) e o `dist/` compilado com tsup para o resto.

### Engine (`packages/engine/src`)

```
core/      tipos, constantes, RNG (mulberry32), log, consultas do tabuleiro, porta CardCatalog
rules/     ações (applyAction), turno, batalha, estresse, zonas, vida, stats, deck
effects/   ganchos que um card pode implementar (types.ts), disparo de Bugs, API para cards (api.ts)
content/   o catálogo do DEV-OH!: cards/<grupo>/<id>.ts, decks iniciais
view/      getView: o que cada jogador pode ver
index.ts   instala o catálogo no kernel e define a API pública
```

- O **kernel** (`core`, `rules`, `effects`, `view`) não importa `content`. Ele conhece só a porta `CardCatalog`, e o `index.ts` faz a ligação.
- Cada **card** é um arquivo com a definição (dados) e os efeitos (ganchos) juntos. Nenhuma regra de card específico fica no kernel: Kelly negando ataque, Wisley segurando dano e o Douglas trocando de forma são todos ganchos do próprio card (`guardAttack`, `shieldBattleDamage`, `onPositionChange`…).
- `applyAction(state, seat, action)` trabalha numa cópia (`structuredClone`) e é determinístico pela seed guardada no estado.

### Servidor (`apps/server/src`) — NestJS em módulos e camadas

```
config/     AppConfig (env validado com zod: porta, CORS, proxy, TTL das salas, limites; ver SECURITY.md)
common/     DomainError, ZodValidationPipe, WsAckFilter (erro → ack {ok:false}), adapter do Socket.IO (origem, conexões por IP)
  security/ limite de taxa (@Throttle), contagem de conexões, log de segurança
modules/
  rooms/    domain (Room) · application (RoomsService + portas) · infrastructure (repositório em memória, ids, limpeza) · presentation (gateway, notifier)
  duel/     application (DuelService: aplica a jogada no engine) · presentation (gateway do evento "action")
  health/   GET /health e GET /
```

- O **domínio** não depende de Nest nem de Socket.IO. A **aplicação** fala com o mundo só pelas portas de `ports.ts`, e o lint garante as duas coisas.
- A injeção é sempre explícita (`@Inject(Token)`), para não depender de metadata de decorators. Por isso o mesmo código roda com `tsx` (dev), Vitest (testes) e `tsc` (build).
- Todo payload que chega passa por um schema do `@devoh/protocol`. Erros viram `{ ok: false, error }` no ack.
- Todo evento de socket novo precisa de `@Throttle('<balde>')`. Os baldes ficam em `config/app-config.ts`.

### Web (`apps/web/src`) — páginas burras, componentes inteligentes

```
app/        main.tsx, router.tsx, tela de erro, estilos globais (tokens.css, base.css, index.css)
pages/      BURRAS: só layout e composição dos componentes dos módulos
modules/    uma pasta por feature:
  <nome>/components/  componentes inteligentes (leem stores, chamam hooks/services)
  <nome>/store/       estado Zustand do módulo
  <nome>/hooks/       hooks do módulo
  <nome>/services/    funções puras e clientes (sem React)
  <nome>/<nome>.css   estilos do módulo
  <nome>/index.ts     API pública: o que outros módulos e páginas podem usar
shared/
  ui/       primitivos visuais (Button, Panel, Spinner, PageHead)
  lib/      storage seguro, useMediaQuery, env
```

Módulos: `cards` (renderização do card), `profile` (apelido, deck e dificuldade salvos), `decks` (biblioteca e deck builder), `collection`, `lobby`, `training` (duelo contra o bot), `online` (salas) e `duel` (o tabuleiro, usado pelo treino e pelo online através da porta `DuelController`).

**Regras de dependência**, verificadas pelo `npm run lint` (`packages/eslint-config/boundaries.js`):

- `pages/` não usa hooks nem estado e não importa `@devoh/*`, stores, `services` ou `shared/lib`. Só compõe componentes vindos da API pública dos módulos.
- Um módulo só importa outro pelo `index.ts` dele, e nunca importa `pages/` nem `app/`.
- `services/` não importa React, Zustand nem componentes.
- `shared/` não conhece módulos nem o jogo.

**Rotas:**

| Rota           | Página                                 |
| -------------- | -------------------------------------- |
| `/`            | início e lobby                         |
| `/colecao`     | coleção de cards                       |
| `/decks`       | deck builder                           |
| `/treino`      | duelo contra o bot                     |
| `/sala/nova`   | cria uma sala                          |
| `/sala/CODIGO` | sala; o F5 reconecta pelo token da aba |

Convite: `/sala/CODIGO`. Sem sessão na aba, o convite abre o lobby em `/?sala=CODIGO` para a pessoa escolher apelido e deck.

## Criar um card novo

1. Crie `packages/engine/src/content/cards/<grupo>/<id>.ts` com `defineCard({ def, effects })`. Use um card parecido como modelo.
2. Efeitos: implemente os ganchos de `effects/types.ts` (`onSummon`, `onActivate`, `onTrigger`, `onIgnite`, `onStandby`, `onDestroyed`, `atkBonus`, `guardAttack`…), importando só de `effects/api`.
3. Registre o card em `content/cards/index.ts`. A posição nessa lista é a ordem da coleção.
4. Se o bot precisar de uma regra para usá-lo bem, adicione em `packages/ai/src/heuristics/cardPlays.ts`.
5. Arte: coloque a imagem em `assets/source`, registre o recorte em `scripts/crop-art.ts` e rode `npm run crop-art`. Alternativa: `art: 'icon:<emoji>|<cor1>|<cor2>'`.
6. `npm test`: as partidas bot×bot pegam efeitos quebrados.

> **Teste golden** (`packages/ai/src/golden.test.ts`): 50 partidas com seed fixa precisam dar exatamente o mesmo resultado. Ele existe para pegar mudanças de comportamento sem querer. Se a mudança de regra **for** intencional, regrave com `npx vitest run -u` em `packages/ai` e explique no commit.

## Criar um módulo no front

1. Crie `apps/web/src/modules/<nome>/` com `components/`, e `store/`, `services/` e `hooks/` conforme precisar.
2. Exporte no `index.ts` só o que páginas e outros módulos podem usar.
3. Regra de negócio e chamadas de rede ficam em `services/` (puras e testáveis). O estado fica no `store/` e os componentes ligam as duas coisas.
4. A página nova em `pages/` só compõe componentes. A rota vai em `app/router.tsx`.
5. Estilos em `modules/<nome>/<nome>.css`, importado em `app/styles/index.css`.

## Deploy

Tudo no Railway, em dois serviços do mesmo repositório, configurados pelo painel. Os arquivos `railway.*.json` servem só de referência dos comandos.

### Serviço `@devoh/server`

1. Settings → Build → Custom Build Command: `npm run build:server`.
2. Settings → Deploy → Custom Start Command: `npm run start:server`. Healthcheck Path: `/health`. O Railway injeta a `PORT`.
3. Variables:
   - `CORS_ORIGIN=https://<url-do-web>`: **obrigatória**. Em produção, o server não sobe sem ela.
   - `TRUST_PROXY=true`: lê o IP real do proxy do Railway para os limites por IP.
   - `NODE_ENV=production`: costuma vir do Railway. Liga o log em JSON e a exigência do `CORS_ORIGIN`.
   - Limites opcionais: ver [SECURITY.md](SECURITY.md).
4. Settings → Networking → Generate Domain, apontando para a porta do log (`DEV-OH! server ouvindo na porta ...`).

### Serviço `@devoh/web`

1. Settings → Build → Custom Build Command: `npm run build`.
2. Settings → Deploy → Custom Start Command: `npx --yes serve@14 -s apps/web/dist -l tcp://0.0.0.0:$PORT`. O `-s` devolve o `index.html` em qualquer rota (`/sala/X`, `/treino`). Healthcheck Path: `/`.
3. Variables: `VITE_SERVER_URL=https://<url-do-server>`, sem barra no final. Ela é lida no build: se mudar, faça redeploy. Ela também entra na CSP (`connect-src`) do `serve.json` que o build gera, junto com os outros cabeçalhos de segurança (`apps/web/security-headers.ts`).
4. Settings → Networking → Generate Domain, apontando para a porta do log (`Accepting connections at http://0.0.0.0:8080`).

Publique o servidor primeiro. O protocolo de rede é compatível nos dois sentidos.

Se o domínio mostrar "Application failed to respond" com o app rodando, a porta do domínio não bate com a do log.

## Regras (v1)

- 4000 LP. Deck de 20 a 30 cards: pessoas da squad com 1 cópia, os demais com até 3. Mão inicial de 4, compra 1 por turno.
- 3 zonas de Profissional, 3 de Task/Bug e 1 de Campo. Uma invocação por turno: nível 5–6 sacrifica 1, nível 7+ sacrifica 2.
- Tasks são ativadas da mão. Bugs ficam virados e disparam sozinhos quando a condição acontece (não no turno em que foram baixados).
- Estresse de 0 a 10: +100 de ATK por ponto, e tomar dano de batalha dá +1. No 10, o Profissional de maior nível pede demissão e o Estresse volta a 5.
- Vence quem zerar os LP do oponente, ou quando o deck do oponente acabar.
