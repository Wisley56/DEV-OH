/** Tamanho máximo do apelido, em caracteres visíveis (code points). */
export const NAME_MAX = 20;
export const DEFAULT_NAME = 'Dev Anônimo';

/**
 * Apelido seguro para exibir aos outros jogadores:
 * - normaliza (NFKC), para letras "de enfeite" virarem as comuns;
 * - tira caracteres de controle, invisíveis e de direção de texto (bidi),
 *   mantendo só o ZWJ usado em emojis compostos;
 * - limita acentos empilhados ("zalgo") e junta espaços;
 * - corta em NAME_MAX; sem nada visível, usa o padrão.
 */
export function sanitizeName(raw: string | undefined, fallback = DEFAULT_NAME): string {
  const cleaned = (raw ?? '')
    .normalize('NFKC')
    .replace(/[\s\p{Z}]+/gu, ' ')
    .replace(/[\p{Cc}\p{Co}\p{Cn}]|(?!‍)\p{Cf}/gu, '')
    .replace(/(\p{M}{2})\p{M}+/gu, '$1')
    .trim();
  const name = Array.from(cleaned).slice(0, NAME_MAX).join('').trim();
  return /[\p{L}\p{N}\p{S}]/u.test(name) ? name : fallback;
}
