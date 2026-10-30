# DEV-OH! — Guia do desenvolvedor

Como rodar, como o código está organizado, como criar cards e módulos e como publicar. A apresentação do jogo está no [README](README.md), as decisões de arquitetura em [docs/adr](docs/adr) e as proteções e limites em [SECURITY.md](SECURITY.md).

## Rodar local

Requer Node 22.22+ (veja `.nvmrc`).

```bash
npm install
npm run dev        # servidor (porta 3001) + web (porta 5173); o engine é lido do código-fonte, sem rebuild
```

Abra http://localhost:5173. O Vite repassa `/api` e `/socket.io` para o servidor (como o `server.mjs` faz em produção), então o site e a API ficam na mesma origem e o cookie de sessão funciona.

O banco em dev é o **PGlite** (Postgres embutido, sem Docker), gravado em `apps/server/.data/dev` (ignorado pelo git). Para começar do zero, apague essa pasta com o server parado. O cadastro usa as chaves de teste do Turnstile, que sempre passam. Para testar o online, crie duas contas: uma numa janela normal e outra numa janela anônima (cada uma tem o seu cookie).

Nenhuma variável de ambiente é obrigatória em dev. Para mudar alguma, copie `apps/server/.env.example` ou `apps/web/.env.example` para `.env` na mesma pasta: o server lê o arquivo com `--env-file-if-exists` e o Vite lê o dele sozinho. Os `.env` são ignorados pelo git.

```bash
npm test           # engine, bots (inclui o golden de paridade), servidor (unit + e2e) e web
npm run lint       # ESLint, incluindo as fronteiras entre camadas
npm run typecheck
npm run format     # Prettier
npm run build:all  # build de todos os workspaces (o CI roda tudo isso)
npm run e2e        # Playwright: sobe server + web com prazos curtos e joga no navegador (usa o Chrome instalado; PW_CHANNEL=msedge para o Edge)
npm run crop-art   # regera as artes a partir de assets/source
npm run balance    # round-robin dos decks iniciais com os bots e relatório de balanceamento (--games N, --hard, --out arquivo)
npm run db:generate -w @devoh/server   # mudou o schema? gera a migration SQL em apps/server/drizzle (versione o arquivo)
npm run admin -w @devoh/server -- users                        # lista as contas do banco da DATABASE_URL
npm run admin -w @devoh/server -- reset-password <usuário>     # senha esquecida: gera uma nova e derruba as sessões
```

Para o `admin` em produção, rode no seu computador com `DATABASE_URL` igual à **DATABASE_PUBLIC_URL** do Postgres no Railway (Variables do serviço Postgres).

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
config/     AppConfig (env validado com zod: porta, CORS, proxy, banco, sessão, Turnstile, limites; ver SECURITY.md)
common/     DomainError (com status HTTP), ZodValidationPipe, WsAckFilter (erro → ack {ok:false}), HttpDomainFilter (erro → {statusCode, message}),
            adapter do Socket.IO (origem, conexões por IP, conta pelo cookie no handshake)
  security/ limite de taxa (@Throttle), OriginGuard (CSRF), contagem de conexões, log de segurança
modules/
  db/       Drizzle sobre pg (produção) ou PGlite (dev/testes); schema.ts, migrations em apps/server/drizzle aplicadas na subida
  accounts/ cadastro (Turnstile), login (argon2id, bloqueio), sessão em cookie HttpOnly, AuthGuard · rotas /api/auth/*
  decks/    decks da conta · rotas /api/decks
  ranking/  Elo e V/D/E gravados no fim de cada partida online (MATCH_RECORDER) · rotas /api/ranking
  rooms/    domain (Room) · application (RoomsService + portas) · infrastructure (repositório em memória, ids, limpeza) · presentation (gateway, notifier)
  duel/     application (DuelService: aplica a jogada no engine) · presentation (gateway do evento "action")
  health/   GET /health e GET /
```

- O **domínio** não depende de Nest nem de Socket.IO. A **aplicação** fala com o mundo só pelas portas de `ports.ts`, e o lint garante as duas coisas.
- A injeção é sempre explícita (`@Inject(Token)`), para não depender de metadata de decorators. Por isso o mesmo código roda com `tsx` (dev), Vitest (testes) e `tsc` (build).
- Todo payload que chega passa por um schema do `@devoh/protocol`. Erros viram `{ ok: false, error }` no ack.
- Todo evento de socket novo precisa de `@Throttle('<balde>')`. Os baldes ficam em `config/app-config.ts`.
- As rotas HTTP ficam em `/api` (o `/health` fica fora, para o healthcheck do Railway). Rota que altera dados passa pelo `OriginGuard`; rota que exige conta usa `@UseGuards(AuthGuard)` e `@CurrentUser()`.
- O assento da sala é da **conta**: a reconexão (`room:rejoin {code}`) acha o lugar pelo `userId` do socket, sem token no navegador. O resultado vai para o ranking uma vez por partida (`Room.matchId` + `recorded`), em `RoomsService.publish`.

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

Módulos: `cards` (renderização do card), `auth` (conta: login, cadastro com Turnstile, `RequireAccount`), `profile` (apelido do visitante, deck, dificuldade e som salvos), `decks` (decks da conta, importação dos antigos e deck builder), `ranking`, `collection`, `lobby` (inclui a lista de salas abertas), `training` (duelo contra o bot), `online` (salas, timer e queda), `duel` (o tabuleiro, usado pelo treino e pelo online através da porta `DuelController`), `sound` (efeitos sonoros) e `tutorial` (tour guiado).

**Animações e sons do duelo** (`modules/duel/services/boardEvents.ts` → `components/fx/FxLayer.tsx`):

- A cada visão nova, as entradas novas do log (que trazem `iid`/`target` dos cards) e as diferenças entre as visões viram uma fila de eventos: ataque, golpe, defesa, dano, destruição, revelação de Bug, Task ativada, invocação…
- A `FxLayer` toca um evento por vez: espadas e escudo em SVG (`fx/Swords.tsx`, `fx/Shield.tsx`), card "fantasma" para o que já saiu do campo, `FlipCard` para virar cards em 3D. Respeita `prefers-reduced-motion`.
- Cada evento também toca um som (`fx/boardSounds.ts` → `modules/sound`). Os arquivos ficam em `apps/web/public/sfx` (CC0, origem em `CREDITS.md`); para trocar um som, substitua o arquivo mantendo o nome.
- O bot e o diálogo de fim de duelo esperam a fila acabar (`DuelController.onFxBusyChange`).
- Para animar um card novo, o log do engine precisa trazer o `iid` dele (`log(s, kind, texto, { seat, cardId, iid })`).

**Regras de dependência**, verificadas pelo `npm run lint` (`packages/eslint-config/boundaries.js`):

- `pages/` não usa hooks nem estado e não importa `@devoh/*`, stores, `services` ou `shared/lib`. Só compõe componentes vindos da API pública dos módulos.
- Um módulo só importa outro pelo `index.ts` dele, e nunca importa `pages/` nem `app/`.
- `services/` não importa React, Zustand nem componentes.
- `shared/` não conhece módulos nem o jogo.

**Rotas:**

| Rota           | Página                                   |
| -------------- | ---------------------------------------- |
| `/`            | início e lobby                           |
| `/colecao`     | coleção de cards                         |
| `/decks`       | deck builder (pede conta)                |
| `/entrar`      | login e cadastro (`?next=` volta)        |
| `/ranking`     | ranking online e suas partidas           |
| `/treino`      | duelo contra o bot                       |
| `/sala/nova`   | cria uma sala                            |
| `/sala/CODIGO` | sala (pede conta); o F5 volta pela conta |

Convite: `/sala/CODIGO`. Se a conta ainda não estiver na sala, o convite abre o lobby em `/?sala=CODIGO` para a pessoa escolher o deck.

O web nunca guarda segredo no navegador: a sessão é um cookie HttpOnly e o `authStore` só sabe "quem sou eu" por `GET /api/auth/me`. No `sessionStorage` fica só o código da sala da aba (para o botão "voltar para o duelo").

## Criar um card novo

1. Crie `packages/engine/src/content/cards/<grupo>/<id>.ts` com `defineCard({ def, effects })`. Use um card parecido como modelo.
2. Dados: `rarity` é obrigatória. Em Task, `speed` (`normal`, `continuous`, `field`, `quick`, `equip`); em Bug, `trigger` e `bugType` (`normal`, `continuous`, `counter`). O `typeLine` tem só raça/função ("Humano / QA"): Normal/Efeito/FLIP e o subtipo são derivados (`cardFrame`, `fullTypeLine` em `core/cardInfo.ts`). Profissional sem módulo de efeito e sem `ignition` é **Normal**.
3. Efeitos: implemente os ganchos de `effects/types.ts` (`onSummon`, `onFlip`, `onActivate`, `onTrigger`, `onIgnite`, `onStandby`, `onDestroyed`, `atkBonus`, `equip`, `guardAttack`…), importando só de `effects/api`. Ao citar um Profissional no log, use `proLabel(slot)`: ele não vaza o nome de um card virado.
4. Registre o card em `content/cards/index.ts`. A posição nessa lista é a ordem da coleção.
5. Se o bot precisar de uma regra para usá-lo bem, adicione em `packages/ai/src/heuristics/cardPlays.ts` (`TASK_PLAYS`, `IGNITION_PLAYS`, `FLIP_PLAYS`, `QUICK_BATTLE_PLAYS`…).
6. Arte: coloque a imagem em `assets/source`, registre o recorte em `scripts/crop-art.ts` e rode `npm run crop-art -- <id>` (sem ids, refaz todos). Alternativa: `art: 'icon:<emoji>|<cor1>|<cor2>'`.
7. `npm test`: as partidas bot×bot pegam efeitos quebrados. Mexeu em stats ou nos decks? Rode `npm run balance` (meta: cada deck inicial entre 45% e 55%; o relatório também lista quem passa do orçamento ATK/DEF por nível).

> **Teste golden** (`packages/ai/src/golden.test.ts`): 50 partidas com seed fixa precisam dar exatamente o mesmo resultado. Ele existe para pegar mudanças de comportamento sem querer. Se a mudança de regra **for** intencional, regrave com `npx vitest run -u` em `packages/ai` e explique no commit.

## Criar um módulo no front

1. Crie `apps/web/src/modules/<nome>/` com `components/`, e `store/`, `services/` e `hooks/` conforme precisar.
2. Exporte no `index.ts` só o que páginas e outros módulos podem usar.
3. Regra de negócio e chamadas de rede ficam em `services/` (puras e testáveis). O estado fica no `store/` e os componentes ligam as duas coisas.
4. A página nova em `pages/` só compõe componentes. A rota vai em `app/router.tsx`.
5. Estilos em `modules/<nome>/<nome>.css`, importado em `app/styles/index.css`.

## Deploy

Tudo no Railway, no mesmo projeto: o banco **PostgreSQL** e dois serviços do mesmo repositório, configurados pelo painel. Os arquivos `railway.*.json` servem só de referência dos comandos.

### Banco

No projeto: **+ New → Database → PostgreSQL**. Ele fica na rede privada e o server lê a URL por referência (abaixo). As migrations rodam sozinhas quando o server sobe.

### Serviço `@devoh/server`

1. Settings → Build → Custom Build Command: `npm run build:server`.
2. Settings → Deploy → Custom Start Command: `npm run start:server`. Healthcheck Path: `/health`. O Railway injeta a `PORT`.
3. Variables:
   - Todas **obrigatórias** em produção: sem qualquer uma, o server não sobe e o log diz qual falta.
     - `CORS_ORIGIN=https://<url-do-web>`, sem barra no final.
     - `DATABASE_URL=${{Postgres.DATABASE_URL}}` (referência ao serviço do banco, pela rede privada).
     - `DB_POOL_MAX=10`: conexões abertas com o banco.
     - `SESSION_TTL_DAYS=30`: validade da sessão (renovada no uso).
     - `TRUST_PROXY_HOPS=2`: proxies na frente do server (borda do Railway + `server.mjs` do web), para achar o IP real no `x-forwarded-for`.
     - `TURNSTILE_SITE_KEY` e `TURNSTILE_SECRET_KEY`: grátis no painel da Cloudflare, em **Turnstile → Add widget**, com o domínio do web.
   - `NODE_ENV=production`: costuma vir do Railway. Liga o log em JSON e as exigências acima.
   - Opcionais: `TURN_TIMEOUT_MS` (tempo do turno no online, padrão 90000) e `RECONNECT_TIMEOUT_MS` (prazo para voltar antes do W.O., padrão 60000). Limites contra abuso: ver [SECURITY.md](SECURITY.md).
4. Settings → Networking → Generate Domain, apontando para a porta do log (`DEV-OH! server ouvindo na porta ...`).

### Serviço `@devoh/web`

1. Settings → Build → Custom Build Command: `npm run build`.
2. Settings → Deploy → Custom Start Command: `node apps/web/server.mjs`. Ele serve o `dist` (devolve o `index.html` em qualquer rota) com os cabeçalhos de segurança que o build gera em `dist/.headers.json` (`apps/web/security-headers.ts`) e repassa `/api` e `/socket.io` (inclusive o WebSocket) para o server. Healthcheck Path: `/`.
3. Variables: `SERVER_INTERNAL_URL=http://${{server.RAILWAY_PRIVATE_DOMAIN}}:${{server.PORT}}` (troque `server` pelo nome do serviço). **Obrigatória**: sem ela o `server.mjs` não sobe. É lida na subida, sem rebuild.
4. Settings → Networking → Generate Domain, apontando para a porta do log (`web ouvindo na porta ...`).

Publique o servidor primeiro. Com o proxy, o navegador só fala com o domínio do web: o server pode até ficar sem domínio público.

Se o domínio mostrar "Application failed to respond" com o app rodando, a porta do domínio não bate com a do log.

## Regras (v1)

- 4000 LP. Deck de 20 a 30 cards: pessoas da squad, Ultra e Secreta com 1 cópia, Super com 2, os demais com até 3. Mão inicial de 4, compra 1 por turno.
- 3 zonas de Profissional, 3 de Task/Bug e 1 de Campo. Uma invocação por turno: nível 5–6 sacrifica 1, nível 7+ sacrifica 2.
- A invocação do turno pode baixar o Profissional virado em Defesa (com os mesmos sacrifícios). Virado, ele não tem efeitos e o oponente não vê quem é (`cardId: null` na visão). A Invocação-Virar (`flipSummon`) vale a partir do turno seguinte: vai para Ataque, dispara `oppSummon`, o FLIP e o "ao ser invocado". Atacado virado, é revelado antes do cálculo e o FLIP resolve depois, mesmo se destruído.
- Tasks são ativadas da mão ou baixadas viradas e ativadas depois do campo (a de Campo não pode ser baixada). Rápidas também valem na Batalha do próprio turno; a Rápida baixada só no turno seguinte. Equipamento exige alvo, fica preso a ele (`equippedTo`) e vai ao cemitério quando ele sai do campo. Uma Task com `trigger` (ex.: Moisés Bombado, `oppAttack`) baixada virada dispara sozinha como um Bug, mirando o Profissional atacado (`fireSetTasks` em `rules/tasks.ts`); `equip` pode devolver `mult` (multiplica ATK e DEF) e `onEndTurn` roda no fim de cada turno para Tasks viradas para cima.
- Bugs ficam virados e disparam sozinhos quando a condição acontece (não no turno em que foram baixados). Bug Contínuo fica virado para cima depois de disparar, com os ganchos passivos ativos. Contra-Bug (trigger `oppBug`) pode anular o Bug do oponente antes de ele resolver (um nível de resposta só).
- Estresse de 0 a 7: +100 de ATK por ponto, e tomar dano de batalha dá +1. No 7, o Profissional de maior nível pede demissão e o Estresse zera.
- Efeitos anulados (Diegão, Juju, A Mão do Moisés): o Profissional fica sem nenhum efeito até o fim do turno indicado e aparece com 🚫 no campo. Auras e bônus dele também param.
- Vence quem zerar os LP do oponente, ou quando o deck do oponente acabar.
