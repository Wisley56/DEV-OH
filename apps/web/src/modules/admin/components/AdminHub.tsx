import { cardFrame, cardList, statAudit } from '@devoh/engine';
import { BarChart3, Layers } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { Button, PageHead, Trail } from '../../../shared/ui';
import { useCatalogRevision } from '../../cards';
import { useCardMaker } from '../../cardmaker';

/** Entrada do painel admin: criador de cartas e balanceamento. */
export function AdminHub() {
  const navigate = useNavigate();
  useCatalogRevision();
  const { records, status, load } = useCardMaker();
  useEffect(() => {
    if (status === 'idle') void load();
  }, [status, load]);

  const count = (s: string) => records.filter((r) => r.status === s).length;
  const all = cardList();
  const over = all.filter((d) => statAudit(d, cardFrame(d) === 'effect').length).length;

  return (
    <div className="page admin-hub">
      <Trail items={[{ label: '// só para contas de administrador' }]} />
      <PageHead title="Painel admin" />
      <div className="admin-hub-grid">
        <HubCard
          icon={<Layers size={22} aria-hidden />}
          title="Criador de cartas"
          text="Monte cartas novas com preview ao vivo, arte, história e efeitos em blocos. A tabela de balanceamento libera a publicação."
          facts={
            status === 'ready' ? [`${count('published')} publicadas`, `${count('draft')} rascunhos`, `${count('retired')} aposentadas`] : []
          }
          action="Abrir o criador"
          onOpen={() => navigate('/admin/cartas')}
        />
        <HubCard
          icon={<BarChart3 size={22} aria-hidden />}
          title="Balanceamento"
          text="Simula milhares de duelos entre bots e mostra a taxa de vitória de cada deck e de cada carta, incluindo as criadas aqui."
          facts={[`${all.length} cartas`, `${over} acima do orçamento`]}
          action="Abrir o painel"
          onOpen={() => navigate('/admin/balanceamento')}
        />
      </div>
    </div>
  );
}

function HubCard({
  icon,
  title,
  text,
  facts,
  action,
  onOpen,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  facts: string[];
  action: string;
  onOpen(): void;
}) {
  return (
    <section className="admin-hub-card panel">
      <h2>
        {icon}
        {title}
      </h2>
      <p>{text}</p>
      {facts.length > 0 && (
        <ul className="admin-hub-facts">
          {facts.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      )}
      <Button variant="primary" onClick={onOpen}>
        {action}
      </Button>
    </section>
  );
}
