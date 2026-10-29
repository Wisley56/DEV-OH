import type { ButtonHTMLAttributes } from 'react';

type Variant = 'default' | 'primary' | 'ghost' | 'battle' | 'end';
type Size = 'md' | 'sm' | 'lg';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

/** Botão padrão do jogo (classes .btn do tema). */
export function Button({ variant = 'default', size = 'md', className = '', type = 'button', ...rest }: Props) {
  const cls = ['btn', variant !== 'default' && `btn-${variant}`, size !== 'md' && `btn-${size}`, className].filter(Boolean).join(' ');
  return <button type={type} className={cls} {...rest} />;
}
