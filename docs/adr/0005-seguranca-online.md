# ADR 0005 — Segurança do jogo online

Status: aceita (2026-10)

## Contexto

O servidor ficou exposto na internet sem limite de taxa, sem teto de conexões ou de salas e com CORS aberto. O CORS não protege o WebSocket: qualquer site podia abrir um socket com o servidor. O web não mandava nenhum cabeçalho de segurança e carregava fontes do Google.

## Decisão

- **Limites em memória:** um balde de tokens por IP (criar sala, entrar ou reconectar) ou por conexão (jogadas, revanche, sair). Também há teto de conexões por IP e teto global de salas. Quem estoura o limite várias vezes é desconectado. Como o jogo roda numa instância só, não há Redis. Com mais de uma instância, os baldes precisariam de um armazenamento compartilhado.
- **Origem:** o handshake do Socket.IO confere o header `Origin` contra `CORS_ORIGIN`. Em produção, o servidor não sobe sem a lista de origens.
- **IP real:** com `TRUST_PROXY=true`, o IP vem do primeiro item do `x-forwarded-for`, que é o proxy do Railway. Nos logs o IP só aparece como hash. _(Revisto no [ADR 0008](0008-contas-banco-e-ranking.md): agora é `TRUST_PROXY_HOPS`, contando os proxies a partir do fim da lista.)_
- **Partida:** no online, o seed do embaralhamento e quem começa vêm de `node:crypto`.
- **Apelido:** `sanitizeName` (`@devoh/protocol`) é a mesma regra no servidor e no navegador. Ela tira caracteres invisíveis, de controle e bidi.
- **Web:** um `serve.json` é gerado no build, com CSP só `'self'` mais o servidor de duelos, anti-iframe, `nosniff` e HSTS. As fontes são servidas pelo próprio site. _(Revisto no [ADR 0008](0008-contas-banco-e-ranking.md): os cabeçalhos vão para `dist/.headers.json`, servidos pelo `server.mjs`, e a CSP ficou só `'self'` mais o Turnstile.)_
- **Logs:** em produção saem em JSON. Os eventos de abuso usam o contexto `Security`.

## Consequências

- Os erros de limite chegam ao jogador no ack, como os outros (`{ ok: false, error }`). O protocolo não mudou.
- Ao adicionar um evento de socket, ele precisa de `@Throttle(...)`.
- Quando o front passar a chamar outro domínio (CDN, analytics), a CSP em `apps/web/security-headers.ts` precisa ser atualizada.
- Rodar o server com `NODE_ENV=production` sem `CORS_ORIGIN` faz o deploy falhar de propósito.
