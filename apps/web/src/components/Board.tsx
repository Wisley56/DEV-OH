import {
  card,
  MAX_STRESS,
  START_LP,
  tributesNeeded,
  type Action,
  type GameView,
  type LogEntry,
  type PlayerView,
  type ProView,
  type TargetKind,
} from '@devoh/game';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { CardFull, CardMini } from './Card';

type Where = 'hand' | 'myPro' | 'mySpell' | 'oppPro' | 'oppSpell' | 'myField' | 'oppField' | 'grave';
interface Selection {
  iid: string;
  cardId: string | null;
  where: Where;
}

type Mode =
  | { kind: 'tribute'; base: Extract<Action, { type: 'summon' }>; need: number; chosen: string[] }
  | { kind: 'target'; base: Action; targetKind: TargetKind; optional: boolean; prompt: string }
  | { kind: 'attack'; iid: string };

export interface BoardProps {
  view: GameView;
  send: (a: Action) => Promise<string | null> | string | null;
  onExit: () => void;
  onRematch?: () => void;
  rematchLabel?: string;
  banner?: ReactNode;
  /** Selo exibido na linha do meio, ao lado da fase (ex.: dificuldade do bot). */
  badge?: ReactNode;
}

/** Mesma condição do bloco "celular deitado" em styles.css. */
const COMPACT_LANDSCAPE = '(orientation: landscape) and (max-height: 560px)';

function useMediaQuery(query: string) {
  const [match, setMatch] = useState(() => matchMedia(query).matches);
  useEffect(() => {
    const mq = matchMedia(query);
    const on = () => setMatch(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return match;
}

/** Tasks/efeitos em que o alvo é obrigatório (espelha o engine). */
const REQUIRED = new Set(['refatoracao', 'hotfix', 'thy_revisor', 'copilot']);

export function Board({ view, send, onExit, onRematch, rematchLabel, banner, badge }: BoardProps) {
  const me = view.players[view.you];
  const opp = view.players[view.you === 0 ? 1 : 0];
  const myTurn = view.active === view.you && view.winner === null;
  const [sel, setSel] = useState<Selection | null>(null);
  const [mode, setMode] = useState<Mode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const toasts = useLogToasts(view.log);
  // Celular deitado: a mão vira uma grade na coluna da direita, sem leque.
  const compact = useMediaQuery(COMPACT_LANDSCAPE);
  // No celular o histórico abre no painel de baixo (no desktop ele fica sempre visível na lateral).
  const [showLog, setShowLog] = useState(false);
  const lastLogId = view.log.at(-1)?.id ?? 0;
  const [seenLogId, setSeenLogId] = useState(lastLogId);
  useEffect(() => {
    if (showLog) setSeenLogId(lastLogId);
  }, [showLog, lastLogId]);
  const unread = view.log.filter((l) => l.id > seenLogId && l.kind !== 'draw').length;
  useEffect(() => {
    if (sel) setShowLog(false);
  }, [sel]);

  useEffect(() => {
    if (!myTurn) setMode(null);
  }, [myTurn]);

  // Escolhendo alvo/sacrifício: fecha o painel para o campo ficar visível (no celular ele cobre a tela).
  useEffect(() => {
    if (mode) setSel(null);
  }, [mode]);

  // Limpa a seleção se o card sumiu.
  useEffect(() => {
    if (!sel) return;
    const exists = sel.where === 'grave' ||
      me.hand?.some((c) => c.iid === sel.iid) ||
      [...me.pros, ...opp.pros, ...me.spells, ...opp.spells, me.field, opp.field].some((x) => x?.iid === sel.iid);
    if (!exists) setSel(null);
  }, [view]); // eslint-disable-line react-hooks/exhaustive-deps

  async function dispatch(a: Action) {
    setMode(null);
    setSel(null);
    const err = await send(a);
    if (err) {
      setError(err);
      setTimeout(() => setError(null), 2600);
    }
  }

  const hasTargets = (k: TargetKind) => {
    if (k === 'oppPro') return opp.pros.some(Boolean);
    if (k === 'ownPro') return me.pros.some(Boolean);
    if (k === 'oppSet') return opp.spells.some((x) => x?.faceDown);
    return [...me.pros, ...opp.pros].some(Boolean);
  };

  /** Abre seleção de alvo quando necessário; senão envia direto. */
  function withTarget(base: Action, cardId: string, targetKind?: TargetKind) {
    if (!targetKind || !hasTargets(targetKind)) return dispatch(base);
    const optional = !REQUIRED.has(cardId);
    const prompts: Record<TargetKind, string> = {
      oppPro: 'Escolha um Profissional do oponente',
      ownPro: 'Escolha um Profissional seu',
      oppSet: 'Escolha um card virado do oponente',
      anyPro: 'Escolha um Profissional',
    };
    setMode({ kind: 'target', base, targetKind, optional, prompt: prompts[targetKind] });
  }

  function startSummon(iid: string, cardId: string, position: 'atk' | 'def') {
    const d = card(cardId);
    const need = tributesNeeded(d.level ?? 1);
    const base = { type: 'summon' as const, iid, position, tributes: [] as string[] };
    if (need > 0) setMode({ kind: 'tribute', base, need, chosen: [] });
    else withTarget(base, cardId, d.target);
  }

  function clickZone(where: Where, iid: string, cardId: string | null) {
    if (mode?.kind === 'tribute' && where === 'myPro') {
      const chosen = mode.chosen.includes(iid) ? mode.chosen.filter((x) => x !== iid) : [...mode.chosen, iid];
      if (chosen.length === mode.need) {
        const base = { ...mode.base, tributes: chosen };
        const d = card(me.hand!.find((c) => c.iid === base.iid)!.cardId);
        setMode(null);
        withTarget(base, d.id, d.target);
      } else setMode({ ...mode, chosen });
      return;
    }
    if (mode?.kind === 'target') {
      const ok =
        (mode.targetKind === 'oppPro' && where === 'oppPro') ||
        (mode.targetKind === 'ownPro' && where === 'myPro') ||
        (mode.targetKind === 'anyPro' && (where === 'myPro' || where === 'oppPro')) ||
        (mode.targetKind === 'oppSet' && where === 'oppSpell');
      if (ok) return dispatch({ ...mode.base, target: iid } as Action);
    }
    if (mode?.kind === 'attack' && where === 'oppPro') {
      return dispatch({ type: 'attack', iid: mode.iid, target: iid });
    }
    setMode(null);
    setSel({ iid, cardId, where });
  }

  const isTargetable = (where: Where, iid: string) => {
    if (!mode) return false;
    if (mode.kind === 'tribute') return where === 'myPro';
    if (mode.kind === 'attack') return where === 'oppPro';
    if (mode.kind === 'target') {
      if (mode.targetKind === 'oppPro') return where === 'oppPro';
      if (mode.targetKind === 'ownPro') return where === 'myPro';
      if (mode.targetKind === 'anyPro') return where === 'myPro' || where === 'oppPro';
      return where === 'oppSpell' && !!opp.spells.find((x) => x?.iid === iid)?.faceDown;
    }
    return false;
  };

  // ───────── Ações do card selecionado ─────────
  const actions: { label: string; onClick: () => void; primary?: boolean }[] = [];
  let hint: string | null = null;
  if (sel && myTurn) {
    if (sel.where === 'hand') {
      const h = me.hand?.find((c) => c.iid === sel.iid);
      if (h) {
        const d = card(h.cardId);
        if (h.canSummon) {
          actions.push({ label: 'Invocar em Ataque', primary: true, onClick: () => startSummon(h.iid, h.cardId, 'atk') });
          actions.push({ label: 'Invocar em Defesa', onClick: () => startSummon(h.iid, h.cardId, 'def') });
        }
        if (h.canActivate) actions.push({ label: 'Ativar Task', primary: true, onClick: () => withTarget({ type: 'activate', iid: h.iid }, d.id, d.target) });
        if (h.canSet) actions.push({ label: 'Baixar Bug virado', primary: true, onClick: () => dispatch({ type: 'set', iid: h.iid }) });
        if (d.kind === 'pro' && !h.canSummon) {
          const need = tributesNeeded(d.level ?? 1);
          const onField = me.pros.filter(Boolean).length;
          if (view.phase !== 'main') hint = 'Invocações só na Fase Principal.';
          else if (me.summonedThisTurn) hint = 'Você já fez sua invocação deste turno.';
          else if (onField < need)
            hint = `Nível ${d.level}: precisa sacrificar ${need} Profissional${need > 1 ? 'is' : ''} do seu campo (você tem ${onField}). Invoque ${need > 1 ? 'outros' : 'outro'} antes.`;
          else hint = 'Sem zona livre para Profissionais.';
        }
      }
    } else if (sel.where === 'myPro') {
      const p = me.pros.find((x) => x?.iid === sel.iid);
      if (p) {
        const d = card(p.cardId);
        if (p.canAttack) {
          actions.push({
            label: opp.pros.some(Boolean) ? 'Atacar' : 'Ataque direto!',
            primary: true,
            onClick: () => (opp.pros.some(Boolean) ? setMode({ kind: 'attack', iid: p.iid }) : dispatch({ type: 'attack', iid: p.iid })),
          });
        }
        if (p.canIgnite && d.ignition) actions.push({ label: d.ignition.label, onClick: () => withTarget({ type: 'ignition', iid: p.iid }, d.id, d.ignition!.target) });
        if (p.canChangePos)
          actions.push({ label: p.position === 'atk' ? 'Mudar para Defesa' : 'Mudar para Ataque', onClick: () => dispatch({ type: 'changePosition', iid: p.iid }) });
      }
    }
  }

  const selectedPro = sel && [...me.pros, ...opp.pros].find((x) => x?.iid === sel.iid);
  const winnerText =
    view.winner === null ? null : view.winner === 'draw' ? 'EMPATE' : view.winner === view.you ? 'SPRINT ENTREGUE!' : 'PROJETO CANCELADO…';

  return (
    <div className="duel">
      <aside className={`side ${sel ? 'has-sel' : ''} ${showLog ? 'show-log' : ''}`}>
        <div className="side-card">
          {sel?.cardId ? (
            <>
              <CardFull cardId={sel.cardId} atk={selectedPro?.atk} def={selectedPro?.def} />
              {actions.length > 0 && (
                <div className="side-actions">
                  {actions.map((a) => (
                    <button key={a.label} className={a.primary ? 'btn btn-primary' : 'btn'} onClick={a.onClick}>
                      {a.label}
                    </button>
                  ))}
                </div>
              )}
              {hint && <p className="side-hint">🔒 {hint}</p>}
              <button className="btn btn-ghost side-close" onClick={() => setSel(null)}>
                Fechar
              </button>
            </>
          ) : (
            <div className="side-empty">
              <p className="side-empty-title">Clique num card</p>
              <p>para ver o texto completo e as ações disponíveis.</p>
            </div>
          )}
        </div>
        <LogPanel log={view.log} open={showLog} onToggle={() => setShowLog((v) => !v)} />
      </aside>

      <main className="arena">
        {banner}
        <PlayerBar p={opp} active={view.active !== view.you} top />
        <div className="field opp">
          <SpellRow p={opp} mine={false} onClick={clickZone} isTargetable={isTargetable} selected={sel?.iid} />
          <ProRow p={opp} mine={false} onClick={clickZone} isTargetable={isTargetable} selected={sel?.iid} />
        </div>

        <div className="midline">
          {badge}
          <div className="phase">
            <span className={`turn-dot ${myTurn ? 'mine' : ''}`} />
            {view.winner !== null ? 'Fim de duelo' : myTurn ? 'Seu turno' : `Turno de ${opp.name}`} · T{view.turn} ·{' '}
            {view.phase === 'main' ? 'Fase Principal' : view.phase === 'battle' ? 'Batalha' : '—'}
          </div>
          <ModeHint mode={mode} oppHasPros={opp.pros.some(Boolean)} onCancel={() => setMode(null)} onDirect={(iid) => dispatch({ type: 'attack', iid })} onNoTarget={(a) => dispatch(a)} />
          <div className="phase-actions">
            {myTurn && view.phase === 'main' && view.turn > 1 && (
              <button className="btn btn-battle" onClick={() => dispatch({ type: 'goBattle' })}>
                ⚔ Batalha
              </button>
            )}
            {myTurn && (
              <button className="btn btn-end" onClick={() => dispatch({ type: 'endTurn' })}>
                Encerrar turno ⏭
              </button>
            )}
            <button className="btn btn-ghost exit-btn" onClick={() => (view.winner === null ? confirm('Desistir e sair do duelo?') && onExit() : onExit())}>
              ✕ Sair
            </button>
          </div>
        </div>

        <div className="field mine">
          <ProRow p={me} mine onClick={clickZone} isTargetable={isTargetable} selected={sel?.iid} tributeChosen={mode?.kind === 'tribute' ? mode.chosen : []} />
          <SpellRow p={me} mine onClick={clickZone} isTargetable={isTargetable} selected={sel?.iid} />
        </div>
        <PlayerBar p={me} active={myTurn} />

        <div className="hand">
          <AnimatePresence initial={false}>
            {me.hand?.map((c, i) => {
              const playable = c.canSummon || c.canActivate || c.canSet;
              const n = me.hand!.length;
              const rot = compact ? 0 : (i - (n - 1) / 2) * Math.min(5, 26 / n);
              return (
                <motion.button
                  key={c.iid}
                  layout
                  initial={{ y: 80, opacity: 0 }}
                  animate={{ y: 0, opacity: 1, rotate: rot }}
                  exit={{ y: -60, opacity: 0, scale: 0.8 }}
                  whileHover={{ y: compact ? -4 : -18, rotate: 0, zIndex: 5 }}
                  className={`hand-card ${playable && myTurn ? 'playable' : ''} ${sel?.iid === c.iid ? 'selected' : ''}`}
                  onClick={() => clickZone('hand', c.iid, c.cardId)}
                >
                  <CardMini cardId={c.cardId} />
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>
      </main>

      <div className="toasts" aria-live="polite">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              className={`toast toast-${t.kind} ${t.seat === view.you ? 'from-me' : 'from-opp'}`}
              initial={{ opacity: 0, y: -16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              {t.text}
            </motion.div>
          ))}
          {error && (
            <motion.div key="err" className="toast toast-error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {error}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {winnerText && (
          <motion.div className="victory" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <motion.div className="victory-box" initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={{ type: 'spring', bounce: 0.4 }}>
              <h2 className={view.winner === view.you ? 'win' : 'lose'}>{winnerText}</h2>
              <p>{view.log.filter((l) => l.kind === 'win').at(-1)?.text}</p>
              <div className="victory-actions">
                {onRematch && (
                  <button className="btn btn-primary" onClick={onRematch}>
                    {rematchLabel ?? 'Revanche'}
                  </button>
                )}
                <button className="btn" onClick={onExit}>
                  Voltar ao menu
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        className="btn log-fab"
        onClick={() => {
          setSel(null);
          setShowLog((v) => !v);
        }}
        aria-label="Histórico do duelo"
      >
        📜{unread > 0 && !showLog && <span className="log-fab-badge">{unread > 99 ? '99+' : unread}</span>}
      </button>
    </div>
  );
}

function ModeHint({
  mode,
  oppHasPros,
  onCancel,
  onDirect,
  onNoTarget,
}: {
  mode: Mode | null;
  oppHasPros: boolean;
  onCancel: () => void;
  onDirect: (iid: string) => void;
  onNoTarget: (a: Action) => void;
}) {
  if (!mode) return null;
  let text = '';
  let extra: ReactNode = null;
  if (mode.kind === 'tribute') text = `Escolha ${mode.need - mode.chosen.length} Profissional(is) seu(s) para sacrificar`;
  if (mode.kind === 'attack') {
    text = 'Escolha o alvo do ataque';
    if (!oppHasPros)
      extra = (
        <button className="btn btn-primary btn-sm" onClick={() => onDirect(mode.iid)}>
          Ataque direto
        </button>
      );
  }
  if (mode.kind === 'target') {
    text = mode.prompt;
    if (mode.optional)
      extra = (
        <button className="btn btn-sm" onClick={() => onNoTarget(mode.base)}>
          Sem alvo
        </button>
      );
  }
  return (
    <div className="mode-hint">
      <span>🎯 {text}</span>
      {extra}
      <button className="btn btn-ghost btn-sm" onClick={onCancel}>
        Cancelar
      </button>
    </div>
  );
}

function PlayerBar({ p, active, top }: { p: PlayerView; active: boolean; top?: boolean }) {
  const lpPct = Math.max(0, Math.min(100, (p.lp / START_LP) * 100));
  const prevLp = useRef(p.lp);
  const [delta, setDelta] = useState<{ v: number; k: number } | null>(null);
  useEffect(() => {
    if (p.lp !== prevLp.current) {
      setDelta({ v: p.lp - prevLp.current, k: Date.now() });
      prevLp.current = p.lp;
      const t = setTimeout(() => setDelta(null), 1600);
      return () => clearTimeout(t);
    }
  }, [p.lp]);
  return (
    <div className={`pbar ${top ? 'top' : ''} ${active ? 'active' : ''}`}>
      <div className="pbar-name">
        {p.name}
        {p.shocked && <span className="chip chip-shock">😱 Chocado</span>}
      </div>
      <div className="lp">
        <div className="lp-label">
          LP <b>{p.lp}</b>
        </div>
        <div className="lp-track">
          <motion.div className="lp-fill" animate={{ width: `${lpPct}%` }} transition={{ duration: 0.6 }} />
        </div>
        <AnimatePresence>
          {delta && (
            <motion.span
              key={delta.k}
              className={`lp-delta ${delta.v < 0 ? 'neg' : 'pos'}`}
              initial={{ opacity: 0, y: 0 }}
              animate={{ opacity: 1, y: -22 }}
              exit={{ opacity: 0 }}
            >
              {delta.v > 0 ? '+' : ''}
              {delta.v}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      <div className="stress" title={`Estresse ${p.stress}/${MAX_STRESS}: cada ponto dá +100 ATK aos Profissionais. No 10, o de maior nível pede demissão.`}>
        <span className="stress-label">Estresse</span>
        <div className="stress-pips">
          {Array.from({ length: MAX_STRESS }, (_, i) => (
            <span key={i} className={`pip ${i < p.stress ? 'on' : ''} ${i >= 7 ? 'danger' : ''}`} />
          ))}
        </div>
      </div>
      <div className="pbar-counts">
        <span title="Cards no deck">🂠 {p.deckCount}</span>
        <span title="Cards na mão">✋ {p.handCount}</span>
        <span title="Desligados (cemitério)">🪦 {p.grave.length}</span>
      </div>
    </div>
  );
}

interface RowProps {
  p: PlayerView;
  mine: boolean;
  onClick: (where: Where, iid: string, cardId: string | null) => void;
  isTargetable: (where: Where, iid: string) => boolean;
  selected?: string;
  tributeChosen?: string[];
}

function ProRow({ p, mine, onClick, isTargetable, selected, tributeChosen = [] }: RowProps) {
  const where: Where = mine ? 'myPro' : 'oppPro';
  return (
    <div className="row pro-row">
      {p.pros.map((x: ProView | null, i) => (
        <div key={i} className="zone zone-pro">
          <AnimatePresence mode="popLayout">
            {x && (
              <motion.button
                key={x.iid + x.cardId}
                className={`zone-card ${x.position === 'def' ? 'is-def' : ''} ${isTargetable(where, x.iid) ? 'targetable' : ''} ${selected === x.iid ? 'selected' : ''} ${tributeChosen.includes(x.iid) ? 'tribute' : ''} ${mine && x.canAttack ? 'ready' : ''}`}
                initial={{ scale: 1.6, opacity: 0, y: mine ? 40 : -40 }}
                animate={{ scale: 1, opacity: 1, y: 0, rotate: x.position === 'def' ? 90 : 0 }}
                exit={{ scale: 0.4, opacity: 0, rotate: 25, filter: 'brightness(3)' }}
                transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                onClick={() => onClick(where, x.iid, x.cardId)}
              >
                <CardMini cardId={x.cardId} atk={x.atk} def={x.def} position={x.position} badge={x.locked ? <span className="badge">💘</span> : undefined} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

function SpellRow({ p, mine, onClick, isTargetable, selected }: RowProps) {
  const where: Where = mine ? 'mySpell' : 'oppSpell';
  const fieldWhere: Where = mine ? 'myField' : 'oppField';
  return (
    <div className="row spell-row">
      <div className="zone zone-field" title="Zona de Campo">
        {p.field ? (
          <button className={`zone-card ${selected === p.field.iid ? 'selected' : ''}`} onClick={() => onClick(fieldWhere, p.field!.iid, p.field!.cardId)}>
            <CardMini cardId={p.field.cardId} />
          </button>
        ) : (
          <span className="zone-label">Campo</span>
        )}
      </div>
      {p.spells.map((x, i) => (
        <div key={i} className="zone zone-spell">
          <AnimatePresence mode="popLayout">
            {x && (
              <motion.button
                key={x.iid}
                className={`zone-card ${isTargetable(where, x.iid) ? 'targetable' : ''} ${selected === x.iid ? 'selected' : ''}`}
                initial={{ opacity: 0, y: mine ? 30 : -30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, rotateY: 90, scale: 1.2 }}
                onClick={() => onClick(where, x.iid, x.cardId)}
              >
                <CardMini cardId={x.cardId} faceDown={x.faceDown} badge={!mine && x.revealed && x.faceDown ? <span className="badge">👁</span> : undefined} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      ))}
      <div className="zone zone-grave" title="Desligados (cemitério)">
        {p.grave.length ? (
          <button className="zone-card" onClick={() => onClick('grave', `grave-${mine}`, p.grave[p.grave.length - 1])}>
            <CardMini cardId={p.grave[p.grave.length - 1]} className="grave-top" />
          </button>
        ) : (
          <span className="zone-label">Desligados</span>
        )}
      </div>
    </div>
  );
}

function LogPanel({ log, open, onToggle }: { log: LogEntry[]; open: boolean; onToggle: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight });
  }, [log.length, open]);
  return (
    <div className={`log ${open ? 'open' : ''}`}>
      <button className="log-head" onClick={onToggle}>
        📜 Histórico do duelo <span>{open ? '▾' : '▸'}</span>
      </button>
      <div className="log-body" ref={ref}>
        {log.map((l) => (
          <div key={l.id} className={`log-line log-${l.kind}`}>
            {l.text}
          </div>
        ))}
      </div>
    </div>
  );
}

const TOAST_KINDS = new Set(['bug', 'effect', 'coin', 'stress', 'summon', 'task', 'attack', 'destroy']);

/** Mostra as entradas novas do log como notificações temporárias. */
function useLogToasts(log: LogEntry[]) {
  const [items, setItems] = useState<LogEntry[]>([]);
  const lastId = useRef<number | null>(null);
  const fresh = useMemo(() => {
    if (lastId.current === null) return [];
    return log.filter((l) => l.id > lastId.current! && TOAST_KINDS.has(l.kind) && !(l.kind === 'stress' && !l.text.includes('limite')));
  }, [log]);
  useEffect(() => {
    lastId.current = log.at(-1)?.id ?? 0;
    if (!fresh.length) return;
    const add = fresh.slice(-4);
    setItems((cur) => [...cur, ...add].slice(-4));
    const ids = new Set(add.map((a) => a.id));
    // Sem cleanup de propósito: cada lote some sozinho mesmo se o log mudar antes.
    setTimeout(() => setItems((cur) => cur.filter((x) => !ids.has(x.id))), 3200);
  }, [log]); // eslint-disable-line react-hooks/exhaustive-deps
  return items;
}
