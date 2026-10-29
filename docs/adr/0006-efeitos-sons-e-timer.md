# ADR 0006 — Efeitos do tabuleiro, sons e relógio do online

Status: aceita (2026-10)

## Contexto

O tabuleiro só pulava para o estado novo. Quem perdia não via o ataque, a armadilha nem o dano que decidiram o jogo. No online, um jogador parado ou que caía travava a partida para sempre.

## Decisão

- **Efeitos derivados do log:**
  - O engine continua puro e não emite eventos de animação.
  - O log ganhou referências estruturadas (`iid`, `target`) e o estado ganhou `outcome` (por que o duelo acabou).
  - O front compara a visão anterior com a nova (`boardEvents`) e monta uma fila tocada por uma camada por cima do tabuleiro (`FxLayer`).
  - Funciona igual no treino e no online, porque os dois só entregam visões.
- **Cards que saíram do campo** são animados por um "fantasma" desenhado na última posição conhecida da zona.
- **Sons:**
  - São arquivos curtos de domínio público (CC0): Kenney, StarNinjas e rubberduck, via OpenGameArt.
  - Tocam pela Web Audio API e só carregam quando um duelo abre.
  - Se o navegador não decodificar o arquivo, toca um som sintetizado no lugar.
- **Relógio no servidor:**
  - A sala guarda o prazo do turno e o prazo de volta de quem caiu.
  - Um `Scheduler` (porta da aplicação, implementado com `setTimeout`) dispara a passagem de turno e o W.O. pela função pura `forfeit` do engine.
  - O cliente só exibe a contagem, corrigindo a diferença de relógio com `serverNow`.
- **Bibliotecas:**
  - O flip 3D usa um componente próprio com framer-motion. O react-card-flip não suporta React 19.
  - Arrastar e soltar usa `@dnd-kit/core`. O react-beautiful-dnd foi descontinuado e não suporta React 19.
  - O framer-motion carrega os recursos de animação sob demanda (`LazyMotion`).

## Consequências

- O golden foi regravado uma vez: só o hash mudou, porque a visão final agora inclui `outcome`. Vencedor, turnos, LP e passos são idênticos.
- Um card novo precisa logar o `iid` nas ações que devem animar.
- Como os timers vivem na memória do processo, reiniciar o servidor encerra os duelos, como já acontecia com as salas.
