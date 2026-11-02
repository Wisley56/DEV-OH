/**
 * Erro esperado de regra de negócio: a mensagem vai para o jogador (no ack do socket
 * ou no corpo da resposta HTTP, com o `status` dado). `problems` lista todos, quando há vários.
 */
export class DomainError extends Error {
  constructor(
    message: string,
    readonly status = 400,
    readonly problems?: string[],
  ) {
    super(message);
    this.name = 'DomainError';
  }
}
