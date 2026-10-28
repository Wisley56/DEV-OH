# DEV-OH! — Guia do desenvolvedor

Como rodar, estruturar, criar cards e publicar o jogo. A apresentação do jogo está no [README](README.md).

## Rodar local

```bash
npm install
npm run dev        # servidor (porta 3001) + web (porta 5173)
```

Abra http://localhost:5173. Para testar o online, crie uma sala numa aba e entre com o código em outra.
Na mesma rede, o colega acessa `http://<seu-ip>:5173`.

```bash
npm test           # regras do engine + 60 partidas bot vs bot
npm run typecheck
npm run crop-art   # regera as artes a partir de assets/source
```

## Estrutura

| Pasta | O quê |
| --- | --- |
| `packages/game` | Regras puras (engine, cards, efeitos, decks, bot, visão por jogador). Usado pelo web e pelo servidor. |
| `apps/web` | React + Vite: lobby, coleção, deck builder, tabuleiro. |
| `apps/server` | Node + Socket.IO: salas, servidor autoritativo, esconde a mão do oponente, reconexão. |
| `assets/source` | Imagens originais enviadas. `scripts/crop-art.ts` recorta para `apps/web/public/art`. |

### Criar um card novo

1. Adicione a definição em `packages/game/src/cards.ts` (texto, nível, ATK/DEF, arte).
2. Se tiver efeito, implemente em `packages/game/src/effects.ts` (`onSummon`, `onActivate`, `onTrigger`, `onIgnite`, `onStandby`, `onDestroyed`).
3. Arte: coloque a imagem em `assets/source`, registre o recorte em `scripts/crop-art.ts` e rode `npm run crop-art` — ou use `art: 'icon:<emoji>|<cor1>|<cor2>'`.
4. `npm test` roda partidas bot vs bot para pegar efeitos quebrados.

## Deploy

Tudo no Railway, em dois serviços do mesmo repositório (o Railway cria `@devoh/server` e `@devoh/web` sozinho ao detectar os workspaces). A configuração é feita no painel de cada serviço: o Config as Code foi descontinuado para serviços novos, então os arquivos `railway.server.json` e `railway.web.json` servem só de referência dos comandos.

### Serviço `@devoh/server`
1. Settings → Deploy → Custom Start Command: `npm run start:server`. Healthcheck Path: `/health`. O Railway injeta `PORT`.
2. Settings → Networking → Generate Domain, apontando para a porta que aparece no log (`DEV-OH! server ouvindo na porta ...`). Teste em `https://<url-do-server>/health`.
3. Opcional: variável `CORS_ORIGIN=https://<url-do-web>` (o padrão libera qualquer origem).

### Serviço `@devoh/web`
1. Settings → Build → Custom Build Command: `npm run build`.
2. Settings → Deploy → Custom Start Command: `npx --yes serve@14 apps/web/dist -l tcp://0.0.0.0:$PORT`. Healthcheck Path: `/`.
3. Variables: `VITE_SERVER_URL=https://<url-do-server>` (sem barra no final). É lida no build: mudou a variável, faça redeploy.
4. Settings → Networking → Generate Domain, apontando para a porta do log (`Accepting connections at http://0.0.0.0:8080`). Essa é a URL do jogo. Convite: `https://<url-do-web>/?sala=CODIGO`.

Se o domínio mostrar "Application failed to respond" com o app rodando, a porta do domínio não bate com a do log.

## Regras (v1)

- 4000 LP. Deck de 20–30 cards; pessoas da squad 1 cópia, demais até 3. Mão inicial 4, compra 1 por turno.
- 3 zonas de Profissional, 3 de Task/Bug, 1 de Campo. Uma invocação por turno; nível 5–6 sacrifica 1, nível 7+ sacrifica 2.
- Tasks são ativadas da mão; Bugs ficam virados e disparam sozinhos quando a condição acontece (não no turno em que foram baixados).
- Estresse 0–10: +100 ATK por ponto; tomar dano de batalha dá +1; no 10 o Profissional de maior nível pede demissão e o Estresse volta a 5.
- Vence quem zerar os LP do oponente ou quando o deck dele acabar.
