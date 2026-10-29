# ADR 0002 — Catálogo de cards como porta do kernel

Status: aceita (2026-10)

## Contexto

O engine tinha regras de cards específicos (Kelly, Wisley, Douglas, Danilo…) espalhadas pela batalha, pelo cálculo de ATK e pelo estresse, e os efeitos eram registrados por import com efeito colateral.

## Decisão

O kernel (core, rules, effects, view) conhece só a interface CardCatalog e um conjunto de ganchos (CardEffects). Cada card é um arquivo com definição e efeitos juntos, e o index do pacote instala o catálogo do DEV-OH! no kernel. A ordem em que o kernel chama os ganchos reproduz a ordem antiga das regras.

## Consequências

- O kernel não muda quando entram cards novos.
- Cards só importam de effects/api, garantido pelo lint.
- Outro conjunto de cards (expansão, evento) pode ser outro catálogo.
