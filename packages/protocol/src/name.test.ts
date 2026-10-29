import { describe, expect, it } from 'vitest';
import { DEFAULT_NAME, NAME_MAX, sanitizeName } from './name';

describe('sanitizeName', () => {
  it('mantém nomes comuns, acentos e emoji', () => {
    expect(sanitizeName('  Wisley  ')).toBe('Wisley');
    expect(sanitizeName('Patrícia 🚀')).toBe('Patrícia 🚀');
    expect(sanitizeName('Família 👨‍👩‍👧')).toBe('Família 👨‍👩‍👧');
  });

  it('remove invisíveis, controle e bidi', () => {
    expect(sanitizeName('Ana​‌')).toBe('Ana');
    expect(sanitizeName('a‮nimda')).toBe('animda');
    expect(sanitizeName('Bia\n\tSilva\u0007')).toBe('Bia Silva');
  });

  it('cai no padrão quando não sobra nada visível', () => {
    expect(sanitizeName(undefined)).toBe(DEFAULT_NAME);
    expect(sanitizeName('   ')).toBe(DEFAULT_NAME);
    expect(sanitizeName('​⁠‍')).toBe(DEFAULT_NAME);
    expect(sanitizeName('', 'Outro')).toBe('Outro');
  });

  it('normaliza letras de enfeite, limita zalgo e corta no tamanho', () => {
    expect(sanitizeName('𝐖𝐢𝐬𝐥𝐞𝐲')).toBe('Wisley');
    expect(sanitizeName('Ź̂̃̄̅')).toHaveLength(3);
    expect(Array.from(sanitizeName('🚀'.repeat(50)))).toHaveLength(NAME_MAX);
  });
});
