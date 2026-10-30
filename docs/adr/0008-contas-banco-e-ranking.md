# ADR 0008 — Contas, banco PostgreSQL e ranking

Status: aceita (2026-10)

## Contexto

Tudo ficava no navegador: os decks e o apelido no `localStorage`, e o token do assento da sala no `sessionStorage`. O servidor era anônimo e guardava as salas só na memória. Queríamos contas de verdade, decks salvos na conta (em qualquer aparelho) e um ranking das partidas online, sem guardar nenhum segredo no armazenamento do navegador. O orçamento era zero, para uns 6 jogadores, num banco que não hiberna nem tem cold start.

## Decisão

- **Banco:** PostgreSQL do Railway, no mesmo projeto. Ele fica sempre ligado, na rede privada, e é pago pelo crédito do plano Hobby. As opções grátis de fora pausam (Supabase depois de 7 dias, Neon depois de 5 minutos) ou expiram (RDS, Render).
- **Acesso:** Drizzle ORM sobre `pg`.
  - Cada chamada vira uma consulta SQL previsível, sem carregamento escondido de relações.
  - O desempenho vem do schema e dos índices: `users(elo desc, wins desc)` para o ranking, `matches(p0_user, played_at)` e `matches(p1_user, played_at)` para o histórico, `sessions(user_id)`, e a chave `(user_id, id)` dos decks.
  - O pool é limitado (`DB_POOL_MAX`).
  - O acesso fica atrás de portas (`AccountRepository`, `DeckRepository`, `RankingRepository`, `MatchRecorder`): para trocar a ferramenta, só os adapters mudam.
- **Migrations:** SQL gerado pelo `drizzle-kit` (`npm run db:generate`), versionado em `apps/server/drizzle/` e aplicado pelo server na subida, antes de escutar.
- **Dev e testes sem Docker:** fora de produção, o banco é o PGlite, o mesmo Postgres compilado para WASM. Em dev ele grava num arquivo em `.data/`; nos testes e no CI fica em memória. Em produção a config exige `postgres://`.
- **Sessão em cookie HttpOnly, com o site e a API na mesma origem:**
  - O serviço web (`apps/web/server.mjs`) serve o `dist` e repassa `/api` e `/socket.io` (incluindo o WebSocket) para o server pela rede privada (`SERVER_INTERNAL_URL`). Em dev, o proxy do Vite faz o mesmo papel.
  - O cookie `__Host-devoh_session` é `HttpOnly`, `Secure`, `SameSite=Strict`, com `Path=/` e validade de 30 dias renovada no uso. Ele leva um token de 256 bits, e o banco guarda só o SHA-256 dele.
  - O JavaScript do site nunca vê o token: o cliente sabe quem está logado por `GET /api/auth/me`.
  - A CSP do web ficou `connect-src 'self'`.
- **CSRF:** `SameSite=Strict` mais o `OriginGuard`, que confere o `Origin` em toda rota HTTP que altera dados. O handshake do Socket.IO já conferia a origem.
- **Senha:** argon2id (`@node-rs/argon2`, 19 MiB, 2 iterações), com mínimo de 8 caracteres.
  - O erro é genérico: usuário inexistente gasta o mesmo tempo que senha errada.
  - A conta trava por 15 minutos depois de 10 senhas erradas.
  - O balde `auth` limita as tentativas por IP.
  - Senha esquecida se resolve pelo script `admin reset-password`.
- **Cadastro aberto com Cloudflare Turnstile:** o token do widget é conferido no `siteverify` antes de criar a conta. A site key chega pelo `GET /api/auth/config`, sem variável de build. A CSP libera só `challenges.cloudflare.com`.
- **IP real:** `TRUST_PROXY_HOPS` (2 no Railway: a borda e o `server.mjs`) diz quantos itens do fim do `x-forwarded-for` são proxies nossos. Assim o cliente não consegue forjar o próprio IP.
- **Online pela conta:**
  - O handshake sem sessão válida é recusado.
  - O assento guarda o `userId`, e a mesma conta não senta nos dois lados.
  - `room:rejoin {code}` reconecta pela conta. O token do assento saiu do protocolo e do navegador.
- **Ranking:**
  - O Elo começa em 1000, com K = 32 e empate valendo 0,5. A conta é soma zero.
  - O registro acontece em `RoomsService.publish`, o ponto único por onde passam jogada, tempo estourado e W.O.
  - Cada `startMatch` gera um `matchId`, e a flag `recorded` garante um registro por partida (a revanche conta de novo).
  - A gravação roda numa transação com `SELECT … FOR UPDATE` nas duas contas. O `id` da partida é a chave, então gravar duas vezes não conta em dobro.
  - Um erro de banco só vai para o log; a sala segue.
- **Quem precisa de conta:** o online e o deck builder. O treino, a coleção e o ranking continuam livres. Os decks antigos do navegador são oferecidos para importação no primeiro login e depois apagados.

## Consequências

- Em produção, o server não sobe sem `DATABASE_URL`, `DB_POOL_MAX`, `SESSION_TTL_DAYS`, `TRUST_PROXY_HOPS`, `TURNSTILE_SITE_KEY` e `TURNSTILE_SECRET_KEY`. O web não sobe sem `SERVER_INTERNAL_URL`.
- Mudou o schema? Gere e versione a migration. Ela roda sozinha no próximo deploy do server.
- As salas continuam em memória numa instância só. Para escalar para várias instâncias, salas e limites de taxa precisariam de um armazenamento compartilhado; contas, decks e ranking já ficam no banco.
- Os testes e2e do server criam contas por HTTP e mandam o cookie no handshake do socket (`test/support.ts`). O Playwright cria as contas pela API, para não depender da Cloudflare, e testa a tela de login.
