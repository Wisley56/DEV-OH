# Segurança do DEV-OH!

## Como reportar

Achou uma falha? Fale direto com o Wisley, em privado. Não abra issue pública. Conte como reproduzir e o que dá para fazer com ela.

## O que protegemos

| Ameaça                                                  | Proteção                                                                                                                                                                                    |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Trapaça no duelo (ver a mão do oponente, jogada ilegal) | O servidor é a autoridade e valida cada jogada no engine. Cada jogador recebe só a sua visão (`getView`). O embaralhamento online usa seed do `crypto`.                                     |
| Payload malicioso derrubar o servidor                   | Todo payload passa por schema zod. As mensagens têm no máximo 16 KB. O teste de fuzz do engine roda milhares de jogadas aleatórias.                                                         |
| Roubo de sessão                                         | Token de 256 bits num cookie `HttpOnly` (o JavaScript não lê), `Secure`, `SameSite=Strict` e `__Host-`. No banco fica só o hash SHA-256. Sair apaga a sessão; trocar a senha derruba todas. |
| Senha vazada ou adivinhada                              | argon2id (parâmetros OWASP), mínimo de 8 caracteres, mensagem genérica no erro, bloqueio de 15 min após 10 senhas erradas e limite de tentativas por IP (`RATE_AUTH_PER_MIN`).              |
| Cadastro em massa por robô                              | Cloudflare Turnstile no cadastro, conferido no servidor antes de criar a conta.                                                                                                             |
| CSRF (site de terceiros agindo com o seu cookie)        | `SameSite=Strict` e checagem do `Origin` em toda rota HTTP que altera dados (`OriginGuard`) e no handshake do Socket.IO.                                                                    |
| Jogar com o lugar ou os decks de outra pessoa           | O assento é da conta (a reconexão confere a conta do cookie) e as rotas de decks só enxergam os decks do dono.                                                                              |
| Força bruta de código de sala                           | 10 tentativas de entrar ou reconectar por minuto, por IP. Salas privadas não aparecem na lista pública (`GET /api/rooms`).                                                                  |
| Lista de salas usada para flood                         | `GET /api/rooms` e `GET /api/ranking` com limite de 20 pedidos de rajada e 1 por segundo por IP (balde `list`); devolve só código, apelido do host e tempo de espera.                       |
| Jogador parado ou que some travando a partida           | Timer de turno (`TURN_TIMEOUT_MS`): estourou, o turno passa; 3 estouros seguidos = derrota. Quem cai tem `RECONNECT_TIMEOUT_MS` para voltar, depois W.O.                                    |
| Flood (salas, jogadas, conexões)                        | Limites por IP e por conexão, teto global de salas e desconexão de quem insiste.                                                                                                            |
| Site de terceiros usando o servidor                     | Checagem de `Origin` no handshake, inclusive no WebSocket, e CORS restrito.                                                                                                                 |
| XSS, clickjacking, sniffing no web                      | CSP só `'self'` (a única exceção é o Turnstile, `challenges.cloudflare.com`), `frame-ancestors 'none'`, `nosniff` e HSTS. O React escapa todo texto.                                        |
| Apelidos enganosos (invisíveis, bidi)                   | `sanitizeName`, a mesma regra no navegador e no servidor.                                                                                                                                   |
| Dependências vulneráveis                                | Dependabot semanal e `npm audit` (high) no CI.                                                                                                                                              |

## Limites padrão (variáveis do servidor)

| Variável                                     | Padrão                                     | O quê                                      |
| -------------------------------------------- | ------------------------------------------ | ------------------------------------------ |
| `CORS_ORIGIN`                                | `*` (obrigatória em produção)              | URLs do web, separadas por vírgula         |
| `TRUST_PROXY_HOPS`                           | `0` (obrigatória em produção)              | Proxies na frente do server (2 no Railway) |
| `DATABASE_URL`                               | PGlite (obrigatória em produção)           | `postgres://…` do Railway                  |
| `DB_POOL_MAX`                                | 10 (obrigatória em produção)               | Conexões com o banco                       |
| `SESSION_TTL_DAYS`                           | 30 (obrigatória em produção)               | Validade da sessão                         |
| `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | chaves de teste (obrigatórias em produção) | Anti-robô do cadastro                      |
| `RATE_AUTH_PER_MIN`                          | 10                                         | Login e cadastro, por IP                   |
| `MAX_ROOMS`                                  | 1000                                       | Salas abertas no servidor                  |
| `MAX_CONN_PER_IP`                            | 20                                         | Conexões simultâneas por IP                |
| `RATE_CREATE_PER_MIN`                        | 5                                          | Salas criadas por IP                       |
| `RATE_JOIN_PER_MIN`                          | 10                                         | Entrar ou reconectar, por IP               |
| `RATE_ACTION_PER_SEC`                        | 10                                         | Jogadas por conexão (rajada de 3×)         |

## Monitoramento

Em produção, o log do servidor sai em JSON. Para ver abusos, filtre por `"context":"Security"` no Railway. Os eventos são `rate-limited`, `kicked`, `origin-refused`, `conn-limit`, `room-limit`, `login-failed`, `account-locked` e `signup-refused`. O IP aparece só como hash.

As decisões estão no [ADR 0005](docs/adr/0005-seguranca-online.md) e no [ADR 0008](docs/adr/0008-contas-banco-e-ranking.md).
