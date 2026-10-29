import { useState } from 'react';
import { Button, CenterScreen, Spinner } from '../../../shared/ui';

/** Link de convite da sala (abre o lobby com o convite, se a pessoa ainda não estiver nela). */
export const inviteLink = (code: string) => `${location.origin}/sala/${code}`;

/** Sala criada, esperando o oponente: código, link de convite e cancelar. */
export function WaitingRoom({ code, onCancel }: { code: string; onCancel: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <CenterScreen>
      <div className="panel waiting">
        <p className="muted">Sala criada! Mande o código ou o link para o oponente:</p>
        <div className="room-code">{code}</div>
        <Button
          onClick={() => {
            navigator.clipboard?.writeText(inviteLink(code));
            setCopied(true);
          }}
        >
          {copied ? '✔ Link copiado' : '🔗 Copiar link de convite'}
        </Button>
        <p className="muted">
          <Spinner /> Aguardando oponente…
        </p>
        <Button variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </CenterScreen>
  );
}
