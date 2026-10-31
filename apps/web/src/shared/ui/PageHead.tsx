import type { ReactNode } from 'react';

/** Cabeçalho das páginas internas: título e controles extras (a barra superior leva de volta ao início). */
export function PageHead({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="page-head">
      <h1>{title}</h1>
      {children}
    </div>
  );
}
