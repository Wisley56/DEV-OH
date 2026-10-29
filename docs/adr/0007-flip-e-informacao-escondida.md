# ADR 0007 — FLIP, informação escondida e cards ricos

Status: aceita (2026-10)

## Contexto

Todo Profissional entrava virado para cima, então não havia blefe: o oponente sempre sabia o que estava enfrentando. Os cards também tinham pouca informação. Raridade não existia, "Normal/Efeito" era só texto no `typeLine` e havia poucos tipos de Task e Bug. Faltava ainda um jeito repetível de medir o balanceamento.

## Decisão

- **Profissional virado** (`ProSlot.faceDown`):
  - fica sempre em Defesa e não tem efeitos (`proEffects` devolve `undefined`, como na negação);
  - é baixado com a invocação do turno (`set` com sacrifícios) e revelado pela Invocação-Virar (`flipSummon`), por ataque ou por efeito (`flipFaceUp`);
  - o FLIP (`onFlip`) resolve até se o card foi destruído no ataque.
- **Informação escondida**:
  - a visão de cada jogador troca o card virado do oponente por `cardId: null` e sem ATK/DEF;
  - os logs não citam o nome dele: `proLabel` escreve "um Profissional virado", e "baixou um card virado" não diz se é Task ou Bug;
  - um teste garante que o `cardId` não aparece na visão do oponente.
- **Bots sem trapaça**:
  - o bot difícil simula numa cópia "com neblina", em que os Profissionais virados do oponente viram um card interno `__oculto` (fora da coleção e do deck) e os Bugs virados não disparam;
  - o bot normal supõe DEF 1500 para um virado desconhecido.
- **Tipos derivados**:
  - `cardFrame`, `fullTypeLine` e `subtypeLabel` (`core/cardInfo.ts`) calculam Normal/Efeito/FLIP e o subtipo a partir dos dados e dos efeitos, sem texto duplicado;
  - raridade é dado do card e define o limite de cópias (`maxCopies`).
- **Tipos novos de Task e Bug**:
  - Rápida (`quick`): também na Batalha do próprio turno, sem janela de resposta no turno do oponente, para não complicar o online e o timer;
  - Equipamento (`equip` + `SpellSlot.equippedTo`);
  - Bug Contínuo;
  - Contra-Bug (trigger `oppBug`, um nível de resposta).
- **Balanceamento medido**: `npm run balance` joga o round-robin dos decks iniciais com os bots e gera o relatório (`docs/balance/latest.md`).

## Consequências

- Toda mensagem de efeito que cita um Profissional em campo deve usar `proLabel`.
- O golden foi regravado: as regras e os decks mudaram de propósito.
- O "win rate quando jogado" do relatório favorece os cards que entram quando o jogador já está ganhando (chefes de nível alto). O critério principal é o win rate de cada deck.
- O teste "difícil vence o normal" passou a usar 100 partidas: com 30, a oscilação das seeds era maior que a margem.
