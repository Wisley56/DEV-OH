# DEV-OH! — A Era dos Devs que Agem

Jogo de duelo de cards online com a squad. Treino contra bot e PvP por salas (código/link), sem login.

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

### Servidor — Railway
1. New Project → Deploy from GitHub repo (raiz do repositório).
2. O `railway.json` já define `npm run start:server` e o healthcheck `/health`. O Railway injeta `PORT`.
3. Variável opcional: `CORS_ORIGIN=https://seu-jogo.vercel.app` (padrão libera qualquer origem).
4. Em Settings → Networking, gere um domínio público.

### Front — Vercel
1. Import do mesmo repositório, **Root Directory = raiz** (o `vercel.json` já aponta build e saída `apps/web/dist`).
2. Variável de ambiente: `VITE_SERVER_URL=https://<seu-servidor>.up.railway.app`.
3. Deploy. O link de convite fica `https://seu-jogo.vercel.app/?sala=CODIGO`.

## Regras (v1)

- 4000 LP. Deck de 20–30 cards; pessoas da squad 1 cópia, demais até 3. Mão inicial 4, compra 1 por turno.
- 3 zonas de Profissional, 3 de Task/Bug, 1 de Campo. Uma invocação por turno; nível 5–6 sacrifica 1, nível 7+ sacrifica 2.
- Tasks são ativadas da mão; Bugs ficam virados e disparam sozinhos quando a condição acontece (não no turno em que foram baixados).
- Estresse 0–10: +100 ATK por ponto; tomar dano de batalha dá +1; no 10 o Profissional de maior nível pede demissão e o Estresse volta a 5.
- Vence quem zerar os LP do oponente ou quando o deck dele acabar.
