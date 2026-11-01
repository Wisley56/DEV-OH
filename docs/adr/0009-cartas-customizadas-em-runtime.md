# ADR 0009 — Cartas customizadas em runtime

Status: aceita (2026-11)

## Contexto

Cada carta era um módulo TypeScript em `packages/engine/src/content/cards/**`, compilado no servidor e no site. Criar uma carta exigia mexer no código e fazer deploy. Queríamos que o administrador criasse cartas por uma tela do painel e publicasse para todos, sem deploy, sem serviço novo no Railway e sem guardar imagem no banco.

## Decisão

- **Duas fontes no mesmo catálogo:**
  - As 65 cartas em código continuam iguais (`BASE_CARD_LIST`, códigos `DVOH-001…065`).
  - As cartas do painel são dados (`CustomCardInput`, id sempre `x_…`) e viram `CardDef` por `toCardDef`. O código delas é `DVOH-X01…`, pelo `serial` dado na primeira publicação.
  - `installCustomCards(records)` reconstrói o catálogo (base + painel). Ele é idempotente, nunca lança erro, e devolve as cartas rejeitadas com o motivo. Quem lê a lista usa o `cardList()` vivo.
- **Estados:** `draft → published → retired`. Uma carta aposentada sai da coleção e dos decks novos, mas continua resolvível pelo id (o mesmo truque do `HIDDEN_CARD`): duelos e decks antigos continuam desenhando a carta.
- **Regras travadas depois de publicar:** tipo, raridade, atributos, gatilho, alvo e efeitos não mudam mais. Nome, linha de tipo, textos e arte continuam editáveis. Para mudar a regra, duplica-se a carta e aposenta-se a antiga. Assim um duelo nunca muda de regra no meio.
- **Banco:** tabela `custom_cards` (migration `0002`), com `input` em jsonb, `serial` único, `version` para lock otimista (PUT com versão velha dá 409) e `art_version`/`art_bytes`. Só rascunho nunca publicado pode ser apagado.
- **Arte num Storage Bucket do Railway** (S3, privado, no mesmo projeto):
  - A porta `ART_STORAGE` tem três adapters: S3 em produção, pasta `.data/art` em dev e memória nos testes.
  - A chave é `cards/<id>/v<N>.webp`. O upload grava primeiro no bucket e depois no banco (guardado por `artVersion`), e apaga a versão anterior.
  - O navegador nunca fala com o bucket. O servidor entrega `GET /api/cards/:id/art?v=N` com `Cache-Control: immutable` quando a versão bate, com um LRU de 200 imagens na memória. Bucket fora do ar dá 503, sem derrubar o resto. A CSP continua `'self'`.
- **Processamento da imagem:** pacote `@devoh/card-art` (sharp), o mesmo usado pelo `npm run crop-art`. Ele aceita só PNG, JPEG ou WebP pelos magic bytes, limita os pixels de entrada e sempre recodifica para WebP 720×620. O recorte vem do cliente (`left`, `top`, `width`, `height`), ou "imagem inteira" com fundo desfocado.
- **Sincronização:**
  - `CatalogService` carrega as cartas publicadas e aposentadas antes do `listen` e recarrega a cada publicação, aposentadoria ou edição de carta publicada.
  - `revision` é um hash dos registros. `GET /api/cards/custom` responde com ETag (304 quando nada mudou).
  - O site carrega o catálogo no loader da rota raiz (prazo de 4 s, depois segue com o catálogo base). O `RoomState` leva `catalogRevision`, e o cliente recarrega quando ela muda.
  - O worker do simulador recebe as cartas do painel e instala antes de rodar.
- **Publicar passa pelo servidor:** `validateCustomInput`, `scoreCard` (ADR 0010) e arte obrigatória. Qualquer problema dá 422 com a lista `problems`. O texto do efeito é sempre gerado dos blocos, nunca enviado pelo cliente.

## Consequências

- Em produção, o server não sobe sem `ART_BUCKET`, `ART_S3_ENDPOINT`, `ART_S3_REGION`, `ART_S3_ACCESS_KEY_ID` e `ART_S3_SECRET_ACCESS_KEY`. `ART_S3_FORCE_PATH_STYLE=true` só para bucket antigo que pede path-style.
- **Uma réplica só.** O catálogo vive na memória do processo. Com mais de uma réplica, as outras só veriam a mudança no próximo boot. Se um dia escalar, recarregar por `LISTEN/NOTIFY` do Postgres.
- O `sharp` virou dependência de produção do server (binário nativo, instalado pelo `npm ci` do build).
- Imagem órfã no bucket (gravou, mas o banco falhou) é possível e inofensiva: a chave é versionada e ninguém a referencia.
- Os testes que instalam cartas do painel limpam o catálogo depois. Os snapshots golden e o DVOH-056 não mudaram.
