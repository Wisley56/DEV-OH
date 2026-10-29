import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { Button } from './Button';

/** Cabeçalho das páginas internas: voltar ao início, título e controles extras. */
export function PageHead({ title, children }: { title: string; children?: ReactNode }) {
  const navigate = useNavigate();
  return (
    <div className="page-head">
      <Button variant="ghost" onClick={() => navigate('/')}>
        ← Voltar
      </Button>
      <h1>{title}</h1>
      {children}
    </div>
  );
}
