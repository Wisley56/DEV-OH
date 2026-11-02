# ADR 0010 — Efeitos em blocos e tabela de balanceamento

Status: aceita (2026-11)

## Contexto

As cartas do painel (ADR 0009) precisam de efeito sem código: o admin não escreve TypeScript, e o servidor não pode executar nada vindo do navegador. E sem um teto, qualquer carta nova poderia quebrar o jogo. Queríamos um conjunto pequeno de peças que cobrisse as cartas simples atuais e uma conta de pontos que bloqueasse a publicação de carta forte demais.

## Decisão

- **Efeitos são dados** (`packages/engine/src/dsl`):
  - Um bloco é `{ when, if?, once?, do[] }` ou um passivo (`equip`, `aura`, `selfAtk`, `guard`, `battleSave`, `shield`).
  - Gatilhos por tipo de carta (`rules.ts`): Profissional (summon, flip, standby, battleKill, destroyed, ignition), Task (activate, standby, endTurn) e Bug (o `trigger` da carta).
  - Ações: dano, dano em si, cura, Estresse, comprar, buscar, ATK temporário, mudar atributos, destruir, devolver, mudar posição, negar e revelar.
  - Alvos: escolhido, a própria carta, a do evento, ou o mais forte, o mais fraco ou um aleatório.
  - Condições: Estresse mínimo, LP máximo, atributo em campo, oponente com Profissionais, chance de 25/50/75%.
  - Limites: 3 blocos, 3 ações por bloco, 2 condições. Cada número tem faixa e passo.
- **`compile.ts`** transforma os blocos nos ganchos de `effects/types.ts`, importando só de `effects/api`. É determinístico (o aleatório vem de `randInt`), limita os números de novo em runtime e pula uma ação sem alvo com uma linha no log.
- **`describe.ts`** gera o texto pt-BR da carta e do log pelas mesmas tabelas. O texto nunca vem do cliente.
- **`validate.ts`** (`validateCustomInput`) devolve mensagens pt-BR. Quem usa: o zod do protocolo, o `install`, a interface e a publicação.
- **Bots:** `packages/ai/src/heuristics/dslPlays.ts` classifica cada ação em ganho, dano ou custo e só entra como fallback para ids `x_`. Nunca joga uma carta que levaria ao colapso de Estresse.
- **Tabela de balanceamento** (`packages/engine/src/balance/table.ts`, só dados; 1 ponto = 100 de ATK/DEF):
  - Curva de ATK+DEF e teto de ATK por nível, em degraus pelo número de sacrifícios (a curva "vanilla"). Profissional Normal ganha ×1,1.
  - Verba de efeito por raridade: Profissional 4/6/8/10/12; Task e Bug 6/9/12/15/18. Super em diante sobe o teto de ATK.
  - Custo das ações com multiplicador do gatilho (standby e ignition ×2,5, flip ×0,8), de cada condição (×0,8) e da chance (o próprio percentual).
- **`scoreCard(input)`** devolve orçamento, uso, linhas de custo, problemas e até 3 sugestões. Cada sugestão é a menor mudança que faz caber e traz um patch (o botão "Aplicar"). `statAudit` substitui a antiga auditoria de ATK/DEF do painel de balanceamento.
- **A tabela bloqueia publicar, não salvar.** O rascunho pode passar do orçamento; o servidor recusa a publicação com 422 e os problemas.
- **Simulador:** `focus` no `BalanceConfig` coloca o rascunho em todos os decks gerados. "Testar no simulador" mostra o win rate dele contra decks sem ele.

## Consequências

- Cartas complexas (Wisley, Curiosa, Douglas…) continuam em código. Uma peça nova de efeito precisa de tipo, `compile`, `describe`, `validate`, custo na tabela e teste.
- **Recalibrar** é mudar os números em `table.ts` e rodar `npm test`. O teste "tabela de balanceamento" em `dsl/dsl.test.ts` confere que as cartas em código transcritas em blocos cabem no orçamento (folga de 1 ponto) e que as fortes demais não passam.
- O teste de equivalência compara cartas simples em código com a versão em blocos (mesmo LP, Estresse e campo), e o fuzz joga milhares de jogadas com blocos aleatórios válidos.
- Mudar a tabela não afeta carta já publicada: a conta só roda ao publicar. Uma carta que passou a ficar acima do orçamento continua no jogo até ser aposentada.
