import { API_BASE } from './env';

/** Corpo de erro das rotas (o ApiError do protocolo): a mensagem já vem em português. */
type ErrorBody = { message?: unknown } | null;

/** Erro de uma rota da API, com a mensagem pronta para mostrar ao jogador. */
export class ApiFailure extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/**
 * Chamada à API na mesma origem do site. O cookie de sessão (HttpOnly) vai sozinho:
 * nenhum token passa pelo JavaScript.
 */
export async function api<T = void>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: init.method ?? 'GET',
      credentials: 'same-origin',
      headers: init.body === undefined ? undefined : { 'content-type': 'application/json' },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch {
    throw new ApiFailure('Não consegui falar com o servidor. Confere a internet?', 0);
  }
  if (res.status === 204) return undefined as T;
  const data = (await res.json().catch(() => null)) as unknown;
  if (!res.ok) {
    const message = (data as ErrorBody)?.message;
    throw new ApiFailure(typeof message === 'string' ? message : 'Algo deu errado no servidor. Tenta de novo.', res.status);
  }
  return data as T;
}
