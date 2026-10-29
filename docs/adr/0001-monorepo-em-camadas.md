# ADR 0001 — Monorepo em camadas por módulo

Status: aceita (2026-10)

## Contexto

O jogo nasceu como um protótipo: engine com dados e regras misturados, servidor num arquivo só e telas React com regra de negócio. A equipe quer evoluir UX, gameplay, segurança e visual sem que cada mudança mexa em tudo.

## Decisão

Dividir em pacotes com responsabilidade única (engine, ai, protocol, presets) e apps (server, web), orquestrados por Turborepo. Dentro de cada um, camadas explícitas por módulo. As fronteiras são verificadas no lint (packages/eslint-config/boundaries.js).

## Consequências

- Mudanças ficam localizadas: card novo só toca content/ e, se preciso, a heurística do bot.
- O CI (lint, typecheck, testes, build) roda em todos os workspaces.
- Um teste golden com 50 partidas de seed fixa protege o comportamento do engine durante refatorações.
