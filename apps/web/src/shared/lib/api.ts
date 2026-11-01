import { API_BASE } from './env';

/** Corpo de erro das rotas (o ApiError do protocolo): a mensagem já vem em português. */
type ErrorBody = { message?: unknown; problems?: unknown } | null;

/** Erro de uma rota da API, com a mensagem pronta para mostrar ao jogador. */
export class ApiFailure extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** Todos os problemas, quando a rota lista vários (ex.: publicar card fora do orçamento). */
    readonly problems: string[] = [],
  ) {
    super(message);
  }
}

/**
 * Chamada à API na mesma origem do site. O cookie de sessão (HttpOnly) vai sozinho:
 * nenhum token passa pelo JavaScript.
 */
export function api<T = void>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  return request<T>(path, {
    method: init.method ?? 'GET',
    headers: init.body === undefined ? undefined : { 'content-type': 'application/json' },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
}

/** Envia um arquivo cru (ex.: imagem) como corpo do pedido, com o tipo do próprio arquivo. */
export function apiUpload<T = void>(path: string, file: Blob, method = 'PUT'): Promise<T> {
  return request<T>(path, { method, headers: { 'content-type': file.type || 'application/octet-stream' }, body: file });
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...init, credentials: 'same-origin' });
  } catch {
    throw new ApiFailure('Não consegui falar com o servidor. Confere a internet?', 0);
  }
  if (res.status === 204) return undefined as T;
  const data = (await res.json().catch(() => null)) as unknown;
  if (!res.ok) {
    const { message, problems } = (data as ErrorBody) ?? {};
    throw new ApiFailure(
      typeof message === 'string' ? message : 'Algo deu errado no servidor. Tenta de novo.',
      res.status,
      Array.isArray(problems) ? problems.filter((p): p is string => typeof p === 'string') : [],
    );
  }
  return data as T;
}
