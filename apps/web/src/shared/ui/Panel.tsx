import type { ReactNode } from 'react';

export function Panel({ className = '', children }: { className?: string; children: ReactNode }) {
  return <section className={`panel ${className}`.trim()}>{children}</section>;
}

/** Tela inteira com o conteúdo centralizado (carregando, erros, sala de espera). */
export function CenterScreen({ children }: { children: ReactNode }) {
  return <div className="center-screen">{children}</div>;
}

export function Spinner() {
  return <span className="spinner" />;
}
