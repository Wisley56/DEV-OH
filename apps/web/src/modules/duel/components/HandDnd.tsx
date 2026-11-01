import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useDndContext,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import type { HandCardView } from '@devoh/engine';
import { EyeOff, Shield, Swords } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from '../../../shared/ui';
import { CardMini } from '../../cards';
import { useDuel, useDuelUi } from '../hooks/useDuel';
import { useDuelActions } from '../hooks/useDuelActions';
import { canDropOn, type DropTarget } from '../services/interaction';

/** Dados de um card da mão sendo arrastado. */
export interface DragCard {
  card: HandCardView;
}

/** Ponto da tela onde o card foi solto (mouse ou toque). */
function dropPoint(e: DragEndEvent) {
  const a = e.activatorEvent as PointerEvent | TouchEvent;
  const start = 'touches' in a ? a.touches[0] : a;
  return { x: (start?.clientX ?? 0) + e.delta.x, y: (start?.clientY ?? 0) + e.delta.y };
}

/**
 * Arrastar da mão para o campo (atalho do fluxo de clique, que continua igual).
 * O arrasto só começa depois de mover alguns pixels, então um clique continua sendo clique.
 */
export function HandDnd({ children }: { children: ReactNode }) {
  const { me } = useDuel();
  const { dropFromHand } = useDuelActions();
  const [active, setActive] = useState<HandCardView | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
  );
  return (
    <DndContext
      sensors={sensors}
      onDragStart={(e) => setActive((e.active.data.current as DragCard | undefined)?.card ?? null)}
      onDragCancel={() => setActive(null)}
      onDragEnd={(e) => {
        setActive(null);
        const c = (e.active.data.current as DragCard | undefined)?.card;
        const target = e.over?.data.current as DropTarget | undefined;
        if (c && target && canDropOn(c, target, me)) dropFromHand(c.iid, c.cardId, target, dropPoint(e));
      }}
    >
      {children}
      <DragOverlay dropAnimation={null}>{active && <CardMini cardId={active.cardId} className="drag-card" />}</DragOverlay>
      <DropMenu />
    </DndContext>
  );
}

/** Zona do meu campo que aceita cards arrastados; destaca quando o card pode cair nela. */
export function DropZone({
  target,
  enabled,
  className,
  slotIid,
  title,
  grave,
  children,
}: {
  target: DropTarget;
  enabled: boolean;
  className: string;
  slotIid?: string;
  title?: string;
  grave?: string;
  children: ReactNode;
}) {
  const { me } = useDuel();
  const { active } = useDndContext();
  const { setNodeRef, isOver } = useDroppable({ id: `${target.row}-${target.zone}`, data: target, disabled: !enabled });
  const dragged = (active?.data.current as DragCard | undefined)?.card;
  const ok = enabled && !!dragged && canDropOn(dragged, target, me);
  return (
    <div
      ref={setNodeRef}
      className={`${className} ${ok ? 'drop-ok' : ''} ${ok && isOver ? 'drop-over' : ''}`}
      data-slot-iid={slotIid}
      data-grave={grave}
      title={title}
    >
      {children}
    </div>
  );
}

/** Menu no ponto do drop: invocar o Profissional em Ataque ou Defesa, ou baixar virado. */
function DropMenu() {
  const choice = useDuelUi((s) => s.dropChoice);
  const setDropChoice = useDuelUi((s) => s.setDropChoice);
  const { startSummon } = useDuelActions();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!choice) return;
    const close = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setDropChoice(null);
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [choice, setDropChoice]);
  if (!choice) return null;
  const pick = (position: 'atk' | 'def' | 'set') => {
    setDropChoice(null);
    startSummon(choice.iid, choice.cardId, position, choice.zone);
  };
  const left = Math.min(Math.max(8, choice.x - 80), window.innerWidth - 168);
  const top = Math.min(Math.max(8, choice.y - 40), window.innerHeight - 140);
  return (
    <div ref={ref} className="drop-menu" style={{ left, top }} role="menu" aria-label="Invocar em">
      <Button variant="primary" size="sm" onClick={() => pick('atk')}>
        <Swords size={14} aria-hidden />
        Ataque
      </Button>
      <Button size="sm" onClick={() => pick('def')}>
        <Shield size={14} aria-hidden />
        Defesa
      </Button>
      <Button size="sm" onClick={() => pick('set')}>
        <EyeOff size={14} aria-hidden />
        Virado
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setDropChoice(null)}>
        Cancelar
      </Button>
    </div>
  );
}
