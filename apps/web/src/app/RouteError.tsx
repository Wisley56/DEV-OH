import { useRouteError } from 'react-router';

/** Tela de erro inesperado (bug no front): oferece recarregar em vez de tela branca. */
export function RouteError() {
  const error = useRouteError();
  console.error(error);
  return (
    <div className="center-screen">
      <div className="panel">
        <h2>Deu ruim no front…</h2>
        <p>Algo quebrou nesta tela. Recarregue a página; se continuar, avise a squad.</p>
        <button className="btn btn-primary" onClick={() => location.assign('/')}>
          Voltar ao início
        </button>
      </div>
    </div>
  );
}
