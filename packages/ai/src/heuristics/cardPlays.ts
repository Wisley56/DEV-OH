import { card, other, prosOf, setCardsOf, type GameState, type PlayerState, type ProSlot, type Seat } from '@devoh/engine';
import { strongest, value } from './board';

/** O que o bot sabe do tabuleiro ao decidir uma jogada. */
export interface PlayCtx {
  s: GameState;
  seat: Seat;
  opp: Seat;
  me: PlayerState;
  oppP: PlayerState;
  mine: ProSlot[];
}

export function playCtx(s: GameState, seat: Seat): PlayCtx {
  const opp = other(seat);
  return { s, seat, opp, me: s.players[seat], oppP: s.players[opp], mine: prosOf(s, seat) };
}

/** Decisão de jogar um card: `{ target }` para jogar (alvo opcional) ou null para segurar. */
type Play = { target?: string } | null;

/** Quando ativar cada Task. Tasks sem entrada são ativadas sempre que possível. */
export const TASK_PLAYS: Record<string, (c: PlayCtx) => Play> = {
  code_review: (c) => (c.me.deck.length > 4 ? {} : null),
  chama_thy: (c) => (c.me.deck.length > 4 ? {} : null),
  cafe: (c) => (c.me.stress >= 3 ? { target: strongest(c.s, c.seat, (x) => x.position === 'atk')?.card.iid } : null),
  home_office: (c) => (c.me.stress >= 2 || c.me.lp <= 2500 ? {} : null),
  ferias: (c) => (c.me.stress >= 5 ? {} : null),
  refatoracao: (c) => {
    const t = strongest(c.s, c.opp);
    return t && value(c.s, c.opp, t) >= 1700 && c.me.stress <= 4 ? { target: t.card.iid } : null;
  },
  hotfix: (c) => {
    const sets = setCardsOf(c.s, c.opp);
    return sets.length ? { target: sets[0].card.iid } : null;
  },
  reuniao: (c) => {
    const t = strongest(c.s, c.opp, (x) => x.position === 'atk');
    return t || c.oppP.stress >= 5 ? { target: t?.card.iid } : null;
  },
  daily: (c) => (c.oppP.stress > c.me.stress && c.me.stress <= 4 ? {} : null),
  leite: (c) =>
    [...c.me.hand, ...c.mine.map((m) => m.card)].some((x) => x.cardId === 'danilo' || card(x.cardId).attribute === 'TERRA') ? {} : null,
  gato_gordo: (c) => (!c.me.field ? {} : null),
  deploy_sexta: (c) => (c.oppP.lp <= 3000 || c.me.lp < c.oppP.lp - 1500 ? {} : null),
  careca_pensante: (c) => {
    const carecas = (seat: Seat) => prosOf(c.s, seat).filter((p) => card(p.card.cardId).tags?.includes('careca')).length;
    return carecas(c.seat) > carecas(c.opp) ? {} : null;
  },
  mao_moises: (c) => {
    const oppCards = [...c.oppP.spells, c.oppP.field].filter(Boolean).length;
    return oppCards >= 2 || c.mine.some((p) => p.card.cardId === 'moises') ? {} : null;
  },
};

/** ATK extra que o card ganha ao virar para Ataque (ex.: Douglas Defensivo vira o de Ataque). */
export const FLIP_ATK_GAIN: Record<string, () => number> = {
  douglas_defensivo: () => card('douglas_ataque').atk ?? 0,
};

/** Quando usar o efeito ativável (ignition) de cada Profissional. Sem entrada = nunca. */
export const IGNITION_PLAYS: Record<string, (c: PlayCtx) => Play> = {
  thy_revisor: (c) => {
    const ia = strongest(c.s, c.opp, (x) => card(x.card.cardId).tags?.includes('ia') ?? false);
    return ia ? { target: ia.card.iid } : null;
  },
  thy_filosofo: (c) => (c.me.stress >= 2 ? {} : null),
  moises: (c) => (c.me.stress >= 4 ? {} : null),
  diegao: (c) => {
    const t = strongest(c.s, c.opp);
    return t ? { target: t.card.iid } : null;
  },
  juju: (c) => (c.oppP.pros.some(Boolean) ? {} : null),
  brunao: (c) => (setCardsOf(c.s, c.opp).length || c.oppP.pros.some((p) => p?.position === 'def') ? {} : null),
  copilot: (c) => {
    if (c.s.turn <= 1) return null;
    const best = strongest(c.s, c.seat, (x) => x.position === 'atk');
    return best ? { target: best.card.iid } : null;
  },
};
