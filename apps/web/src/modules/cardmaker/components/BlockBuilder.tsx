import {
  blockCost,
  CHANCES,
  describeBlock,
  describePassive,
  isPassive,
  MAX_ACTIONS,
  MAX_CONDITIONS,
  MAX_PARTS,
  passiveCost,
  validateEffects,
  type Attribute,
  type CardKind,
  type Condition,
  type CustomCardInput,
  type EffectAction,
  type EffectBlock,
  type EffectPart,
  type Passive,
  type TargetKind,
  type TargetRef,
  type Trigger,
} from '@devoh/engine';
import { Plus, X } from 'lucide-react';
import { Button, Field, NumberField } from '../../../shared/ui';
import { ATTR } from '../../cards';
import {
  ACTION_LABEL,
  actionOptions,
  bugTriggerText,
  CONDITION_LABEL,
  defaultAction,
  defaultCondition,
  defaultPassive,
  isTargeted,
  newBlock,
  PASSIVE_LABEL,
  passiveOptions,
  RANGE_OF,
  RECIPES,
  TARGET_LABEL,
  targetOptions,
  TRIGGER_LABEL,
  triggerOptions,
  type ActionKind,
  type ConditionKind,
  type PassiveKind,
  type Recipe,
} from '../services/blocks';
import { useCardMaker } from '../store/cardMakerStore';

const TARGET_KIND_LABEL: Record<TargetKind, string> = {
  ownPro: '1 Profissional seu',
  oppPro: '1 Profissional do oponente',
  anyPro: '1 Profissional qualquer',
  oppSet: '1 card virado do oponente',
};

const SIDE_LABEL = { me: 'você', opp: 'o oponente', both: 'os dois' } as const;
const KIND_LABEL: Record<CardKind, string> = { pro: 'Profissional', task: 'Task', bug: 'Bug' };

/** Aba Efeitos: blocos "quando X [se Y]: faça A, B" e passivos, com receitas prontas. */
export function BlockBuilder({ locked }: { locked: boolean }) {
  const { input, edit } = useCardMaker();
  const parts = input.effects ?? [];
  const passives = passiveOptions(input);
  const errors = validateEffects(input);
  const setParts = (fn: (p: EffectPart[]) => EffectPart[]) => edit((i) => ({ ...i, effects: fn(i.effects ?? []) }));
  const setPart = (n: number, part: EffectPart) => setParts((p) => p.map((x, i) => (i === n ? part : x)));
  const recipes = RECIPES.filter((r) => r.kinds.includes(input.kind));
  const needsTarget = (input.kind === 'task' && input.speed !== 'equip') || parts.some((p) => !isPassive(p) && p.when === 'ignition');

  const applyRecipe = (r: Recipe) =>
    edit((i) => {
      const next = { ...i, ...r.patch };
      // Equipamento é só o bônus; nos outros, a receita entra junto com o que já existe.
      const kept = r.patch?.speed === 'equip' ? [] : (next.effects ?? []);
      return { ...next, effects: [...kept, structuredClone(r.part)].slice(-MAX_PARTS) };
    });

  return (
    <fieldset className="cmk-fields cmk-blocks" disabled={locked}>
      <p className="muted">
        Cada efeito é um gatilho com até {MAX_ACTIONS} ações. No máximo {MAX_PARTS} efeitos por carta.
        {input.kind === 'pro' && ' Sem efeito, o Profissional é Normal e ganha +10% no orçamento de ATK/DEF.'}
      </p>
      {recipes.length > 0 && (
        <div className="cmk-recipes" role="group" aria-label="Receitas">
          <span>Receitas:</span>
          {recipes.map((r) => (
            <Button
              key={r.label}
              size="sm"
              variant="ghost"
              disabled={parts.length >= MAX_PARTS && r.patch?.speed !== 'equip'}
              onClick={() => applyRecipe(r)}
            >
              + {r.label}
            </Button>
          ))}
        </div>
      )}
      {needsTarget && (
        <Field label="Alvo escolhido ao ativar" hint="Necessário para ações em “o alvo escolhido”.">
          {(id) => (
            <select
              id={id}
              value={input.target ?? ''}
              onChange={(e) => edit((i) => ({ ...i, target: (e.target.value || undefined) as TargetKind | undefined }))}
            >
              <option value="">Sem alvo</option>
              {(Object.keys(TARGET_KIND_LABEL) as TargetKind[]).map((t) => (
                <option key={t} value={t}>
                  {TARGET_KIND_LABEL[t]}
                </option>
              ))}
            </select>
          )}
        </Field>
      )}

      {parts.length === 0 && (
        <div className="cmk-empty">
          <b>{input.kind === 'pro' ? 'Profissional Normal' : 'Nenhum efeito ainda'}</b>
          <p>
            {input.kind === 'pro'
              ? 'Sem efeitos, a carta mostra a descrição da aba “Texto e história”. Adicione um efeito para virar Profissional de Efeito.'
              : `Toda ${KIND_LABEL[input.kind]} precisa de pelo menos um efeito.`}
          </p>
        </div>
      )}

      <ol className="cmk-block-list">
        {parts.map((part, n) => (
          <li key={n} className="cmk-block panel">
            <header>
              <span className="mono">EFEITO {n + 1}</span>
              <span className="mono cmk-block-pts">{partPts(part, input)} pts</span>
              <Button
                size="sm"
                variant="ghost"
                aria-label={`Remover efeito ${n + 1}`}
                onClick={() => setParts((p) => p.filter((_, i) => i !== n))}
              >
                <X size={16} aria-hidden />
              </Button>
            </header>
            {isPassive(part) ? (
              <PassiveEditor part={part} options={passives} onChange={(p) => setPart(n, p)} />
            ) : (
              <BlockEditor block={part} input={input} onChange={(b) => setPart(n, b)} />
            )}
            <p className="cmk-block-text">
              <span className="mono">TEXTO · </span>
              {partText(part, input)}
            </p>
          </li>
        ))}
      </ol>

      {parts.length < MAX_PARTS && (
        <div className="cmk-add-part">
          <Button size="sm" onClick={() => setParts((p) => [...p, newBlock(input)])}>
            <Plus size={16} aria-hidden /> Efeito
          </Button>
          {passives.length > 0 && (
            <Button size="sm" onClick={() => setParts((p) => [...p, defaultPassive(passives[0]!)])}>
              <Plus size={16} aria-hidden /> Sempre ativo
            </Button>
          )}
        </div>
      )}
      {errors.length > 0 && (
        <ul className="cmk-errors" aria-label="Problemas nos efeitos">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
    </fieldset>
  );
}

function partPts(part: EffectPart, input: CustomCardInput) {
  try {
    return Math.round((isPassive(part) ? passiveCost(part) : blockCost(part, input)) * 10) / 10;
  } catch {
    return '?';
  }
}

function partText(part: EffectPart, input: CustomCardInput) {
  try {
    return isPassive(part) ? describePassive(part) : describeBlock(part, input);
  } catch {
    return '—';
  }
}

function BlockEditor({ block, input, onChange }: { block: EffectBlock; input: CustomCardInput; onChange(b: EffectBlock): void }) {
  const triggers = triggerOptions(input);
  const conds = block.if ?? [];
  const setAction = (n: number, a: EffectAction) => onChange({ ...block, do: block.do.map((x, i) => (i === n ? a : x)) });
  const setCond = (n: number, c: Condition) => onChange({ ...block, if: conds.map((x, i) => (i === n ? c : x)) });

  return (
    <div className="cmk-block-body">
      <div className="cmk-row">
        <Field label="Quando">
          {(id) =>
            block.when === 'bug' ? (
              <input id={id} value={bugTriggerText(input)} readOnly />
            ) : (
              <select
                id={id}
                value={block.when}
                onChange={(e) => {
                  const when = e.target.value as Trigger;
                  onChange({ ...block, when, label: when === 'ignition' ? (block.label ?? 'Efeito') : undefined });
                }}
              >
                {triggers.map((t) => (
                  <option key={t} value={t}>
                    {TRIGGER_LABEL[t]}
                  </option>
                ))}
              </select>
            )
          }
        </Field>
        {block.when === 'ignition' && (
          <Field label="Nome do botão" count={`${(block.label ?? '').length}/30`}>
            {(id) => (
              <input id={id} value={block.label ?? ''} maxLength={30} onChange={(e) => onChange({ ...block, label: e.target.value })} />
            )}
          </Field>
        )}
      </div>

      {conds.map((c, n) => (
        <div key={n} className="cmk-cond">
          <ConditionEditor cond={c} onChange={(x) => setCond(n, x)} />
          <Button
            size="sm"
            variant="ghost"
            aria-label="Remover condição"
            onClick={() => {
              const rest = conds.filter((_, i) => i !== n);
              onChange({ ...block, if: rest.length ? rest : undefined });
            }}
          >
            <X size={16} aria-hidden />
          </Button>
        </div>
      ))}

      <ol className="cmk-actions">
        {block.do.map((a, n) => (
          <li key={n}>
            <span className="mono">{n + 1}.</span>
            <ActionEditor action={a} input={input} when={block.when} onChange={(x) => setAction(n, x)} />
            {block.do.length > 1 && (
              <Button
                size="sm"
                variant="ghost"
                aria-label={`Remover ação ${n + 1}`}
                onClick={() => onChange({ ...block, do: block.do.filter((_, i) => i !== n) })}
              >
                <X size={16} aria-hidden />
              </Button>
            )}
          </li>
        ))}
      </ol>
      <div className="cmk-add-part">
        {block.do.length < MAX_ACTIONS && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onChange({ ...block, do: [...block.do, defaultAction('damage', input, block.when)] })}
          >
            + ação
          </Button>
        )}
        {conds.length < MAX_CONDITIONS && (
          <select
            aria-label="Adicionar condição"
            className="cmk-add-cond"
            value=""
            onChange={(e) => e.target.value && onChange({ ...block, if: [...conds, defaultCondition(e.target.value as ConditionKind)] })}
          >
            <option value="">+ condição…</option>
            {(Object.keys(CONDITION_LABEL) as ConditionKind[]).map((k) => (
              <option key={k} value={k}>
                {CONDITION_LABEL[k]}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}

function ActionEditor({
  action,
  input,
  when,
  onChange,
}: {
  action: EffectAction;
  input: CustomCardInput;
  when: Trigger;
  onChange(a: EffectAction): void;
}) {
  const range = RANGE_OF[action.do];
  return (
    <div className="cmk-action">
      <select aria-label="Ação" value={action.do} onChange={(e) => onChange(defaultAction(e.target.value as ActionKind, input, when))}>
        {actionOptions(input).map((k) => (
          <option key={k} value={k}>
            {ACTION_LABEL[k]}
          </option>
        ))}
      </select>
      {action.do === 'stress' && (
        <select
          aria-label="De quem"
          value={action.side}
          onChange={(e) => onChange({ ...action, side: e.target.value as 'me' | 'opp' | 'both' })}
        >
          {(['opp', 'me', 'both'] as const).map((s) => (
            <option key={s} value={s}>
              {SIDE_LABEL[s]}
            </option>
          ))}
        </select>
      )}
      {action.do === 'search' && (
        <select aria-label="Tipo buscado" value={action.kind} onChange={(e) => onChange({ ...action, kind: e.target.value as CardKind })}>
          {(['task', 'bug', 'pro'] as const).map((k) => (
            <option key={k} value={k}>
              {KIND_LABEL[k]}
            </option>
          ))}
        </select>
      )}
      {'target' in action && isTargeted(action.do) && (
        <select aria-label="Alvo" value={action.target} onChange={(e) => onChange({ ...action, target: e.target.value as TargetRef })}>
          {targetOptions(input, when).map((t) => (
            <option key={t} value={t}>
              {TARGET_LABEL[t]}
            </option>
          ))}
        </select>
      )}
      {range && 'amount' in action && (
        <NumberField label="Valor" value={action.amount} {...range} onChange={(amount) => onChange({ ...action, amount })} />
      )}
      {range && action.do === 'modStats' && (
        <>
          <NumberField label="ATK" value={action.atk} {...range} onChange={(atk) => onChange({ ...action, atk })} />
          <NumberField label="DEF" value={action.def} {...range} onChange={(def) => onChange({ ...action, def })} />
        </>
      )}
    </div>
  );
}

function PassiveEditor({ part, options, onChange }: { part: Passive; options: PassiveKind[]; onChange(p: Passive): void }) {
  const range = RANGE_OF[part.passive];
  return (
    <div className="cmk-action">
      <select
        aria-label="Efeito sempre ativo"
        value={part.passive}
        onChange={(e) => onChange(defaultPassive(e.target.value as PassiveKind))}
      >
        {options.map((k) => (
          <option key={k} value={k}>
            {PASSIVE_LABEL[k]}
          </option>
        ))}
      </select>
      {part.passive === 'aura' && (
        <select aria-label="Lado" value={part.side} onChange={(e) => onChange({ ...part, side: e.target.value as 'me' | 'opp' })}>
          <option value="me">seus Profissionais</option>
          <option value="opp">os do oponente</option>
        </select>
      )}
      {range && (part.passive === 'equip' || part.passive === 'aura') && (
        <>
          <NumberField label="ATK" value={part.atk} {...range} onChange={(atk) => onChange({ ...part, atk })} />
          <NumberField label="DEF" value={part.def} {...range} onChange={(def) => onChange({ ...part, def })} />
        </>
      )}
      {range && part.passive === 'selfAtk' && (
        <NumberField label="ATK" value={part.amount} {...range} onChange={(amount) => onChange({ ...part, amount })} />
      )}
    </div>
  );
}

function ConditionEditor({ cond, onChange }: { cond: Condition; onChange(c: Condition): void }) {
  const range = RANGE_OF[cond.if];
  return (
    <div className="cmk-action">
      <span className="cmk-cond-label">{CONDITION_LABEL[cond.if]}</span>
      {(cond.if === 'stressAtLeast' || cond.if === 'lpAtMost') && (
        <>
          <select aria-label="De quem" value={cond.side} onChange={(e) => onChange({ ...cond, side: e.target.value as 'me' | 'opp' })}>
            <option value="me">seu</option>
            <option value="opp">do oponente</option>
          </select>
          {range && <NumberField label="Valor" value={cond.n} {...range} onChange={(n) => onChange({ ...cond, n })} />}
        </>
      )}
      {cond.if === 'controlsAttr' && (
        <select aria-label="Atributo" value={cond.attr} onChange={(e) => onChange({ ...cond, attr: e.target.value as Attribute })}>
          {(Object.keys(ATTR) as Attribute[]).map((a) => (
            <option key={a} value={a}>
              {ATTR[a].label}
            </option>
          ))}
        </select>
      )}
      {cond.if === 'chance' && (
        <select aria-label="Chance" value={cond.pct} onChange={(e) => onChange({ ...cond, pct: Number(e.target.value) })}>
          {CHANCES.map((p) => (
            <option key={p} value={p}>
              {p}%
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
