# ADR 0004 — Páginas burras, componentes inteligentes e Zustand

Status: aceita (2026-10)

## Contexto

As telas concentravam estado, regras de interação (seleção, alvo, sacrifício), loop do bot e conexão de rede. Isso dificultava testar e evoluir a UX.

## Decisão

As páginas (pages/) só compõem componentes e não usam hooks. A lógica fica nos componentes dos módulos, que leem stores Zustand e chamam services puros. As regras de interação do tabuleiro estão em modules/duel/services/interaction.ts. Estado com escopo de tela (tabuleiro, deck builder) usa um store por instância via contexto; estado global (perfil, biblioteca de decks, sala online), um store por módulo. Navegação com React Router e URLs reais.

## Consequências

- Regras de interação testáveis sem DOM.
- O tabuleiro funciona com qualquer DuelController (treino local ou sala online).
- O lint barra hooks, stores e services nas páginas e imports profundos entre módulos.
