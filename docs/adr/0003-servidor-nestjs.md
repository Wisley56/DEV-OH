# ADR 0003 — Servidor em NestJS com DI explícita

Status: aceita (2026-10)

## Contexto

O servidor de salas precisava de módulos, validação de entrada e testes sem perder a simplicidade do Socket.IO.

## Decisão

NestJS 12 com gateways Socket.IO, módulos rooms, duel, health e config, e camadas domain → application → infrastructure/presentation. A injeção é sempre explícita (@Inject(Token)), sem depender de emitDecoratorMetadata. Assim o mesmo código roda em tsx (dev), Vitest (testes) e tsc (build). Todo payload é validado com os schemas zod do @devoh/protocol, e os erros viram ack {ok:false}.

## Consequências

- O domínio (Room) é testável sem framework, e o RoomsService é testado com portas falsas.
- Teste e2e com dois clientes reais.
- O protocolo de rede não mudou: front antigo e servidor novo convivem durante o deploy.
