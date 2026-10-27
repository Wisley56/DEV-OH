import { card, type Attribute, type CardDef } from '@devoh/game';
import type { CSSProperties, ReactNode } from 'react';

const ATTR: Record<Attribute, { label: string; glyph: string; color: string }> = {
  TREVA: { label: 'TREVA', glyph: '闇', color: '#7b2cbf' },
  AGUA: { label: 'ÁGUA', glyph: '水', color: '#1e88e5' },
  TERRA: { label: 'TERRA', glyph: '地', color: '#6d4c2f' },
  FOGO: { label: 'FOGO', glyph: '炎', color: '#d62828' },
  LUZ: { label: 'LUZ', glyph: '光', color: '#e0a100' },
  TECH: { label: 'TECH', glyph: '⚙', color: '#b8860b' },
};

const KIND_ICON = { task: '⚡', bug: '🐞' } as const;

export function CardArt({ def, className = '' }: { def: CardDef; className?: string }) {
  if (def.art.startsWith('icon:')) {
    const [emoji, c1, c2] = def.art.slice(5).split('|');
    return (
      <div className={`art art-icon ${className}`} style={{ '--c1': c1, '--c2': c2 } as CSSProperties}>
        <span className="art-code" aria-hidden>
          {'if (prazo < hoje) {\n  deploy();\n} // TODO\nwhile(bug) cafe++;\nreturn "funciona";'}
        </span>
        <span className="art-emoji">{emoji}</span>
      </div>
    );
  }
  return <img className={`art art-img ${className}`} src={def.art} alt="" draggable={false} />;
}

function Stars({ n }: { n: number }) {
  return (
    <div className="stars" aria-label={`Nível ${n}`}>
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className="star">★</span>
      ))}
    </div>
  );
}

export function AttrBadge({ def }: { def: CardDef }) {
  if (def.kind !== 'pro' || !def.attribute) {
    const isTask = def.kind === 'task';
    return (
      <span className={`attr attr-${def.kind}`} title={isTask ? 'Task' : 'Bug'}>
        <span className="attr-label">{isTask ? 'TASK' : 'BUG'}</span>
        <span className="attr-glyph">{isTask ? '魔' : '罠'}</span>
      </span>
    );
  }
  const a = ATTR[def.attribute];
  return (
    <span className="attr" style={{ '--attr': a.color } as CSSProperties} title={a.label}>
      <span className="attr-label">{a.label}</span>
      <span className="attr-glyph">{a.glyph}</span>
    </span>
  );
}

/** Card completo, no estilo das cartas da squad. Escala pela largura (container queries). */
export function CardFull({ cardId, atk, def: defVal, style }: { cardId: string; atk?: number; def?: number; style?: CSSProperties }) {
  const d = card(cardId);
  const speedTag = d.speed === 'continuous' ? ' ∞' : d.speed === 'field' ? ' ⛰' : '';
  return (
    <div className={`card-full kind-${d.kind}`} style={style}>
      <div className="cf-inner">
        <div className="cf-name">
          <span className="cf-name-text">{d.name}</span>
          <AttrBadge def={d} />
        </div>
        {d.kind === 'pro' ? (
          <Stars n={d.level ?? 1} />
        ) : (
          <div className="cf-spelltype">
            [{d.kind === 'task' ? 'TASK' : 'BUG'}
            {speedTag}] {KIND_ICON[d.kind]}
          </div>
        )}
        <div className="cf-art">
          <CardArt def={d} />
        </div>
        <div className="cf-text">
          <div className="cf-type">[{d.typeLine}]</div>
          <div className="cf-effect">{d.text}</div>
          {d.flavor && <div className="cf-flavor">{d.flavor}</div>}
          {d.kind === 'pro' && (
            <div className="cf-stats">
              <span>ATK/{fmt(atk ?? d.atk, d.atk)}</span>
              <span>DEF/{fmt(defVal ?? d.def, d.def)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function fmt(v: number | undefined, base: number | undefined): ReactNode {
  if (v === undefined) return '?';
  if (base !== undefined && v !== base) return <b className={v > base ? 'up' : 'down'}>{v}</b>;
  return v;
}

/** Versão compacta para mão e campo. */
export function CardMini({
  cardId,
  atk,
  def: defVal,
  position = 'atk',
  faceDown = false,
  className = '',
  badge,
}: {
  cardId: string | null;
  atk?: number;
  def?: number;
  position?: 'atk' | 'def';
  faceDown?: boolean;
  className?: string;
  badge?: ReactNode;
}) {
  if (!cardId || faceDown) {
    return (
      <div className={`card-mini card-back ${className}`}>
        <div className="cm-inner" />
        {cardId && faceDown && <div className="cm-peek">{card(cardId).name}</div>}
        {badge}
      </div>
    );
  }
  const d = card(cardId);
  return (
    <div className={`card-mini kind-${d.kind} pos-${position} ${className}`}>
      <div className="cm-inner">
        <div className="cm-art">
          <CardArt def={d} />
        </div>
        <div className="cm-name">{d.name}</div>
        {d.kind === 'pro' ? (
          <div className="cm-stats">
            <span className={position === 'atk' ? 'hi' : ''}>{atk ?? d.atk}</span>
            <span className={position === 'def' ? 'hi' : ''}>{defVal ?? d.def}</span>
          </div>
        ) : (
          <div className="cm-kind">{d.kind === 'task' ? 'TASK' : 'BUG'}</div>
        )}
      </div>
      {d.kind === 'pro' && <div className="cm-level">{'★'.repeat(d.level ?? 0)}</div>}
      {badge}
    </div>
  );
}
