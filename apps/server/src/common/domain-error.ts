/** Erro esperado de regra de negócio: a mensagem vai para o jogador no ack. */
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainError';
  }
}
