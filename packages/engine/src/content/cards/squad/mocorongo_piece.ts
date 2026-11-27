import { defineCard, isOnce, log, markOnce, searchDeck, type CardModule, type EffectCtx } from '../../../effects/api';

/** As 5 peças dos Devs Mocorongos, na ordem do corpo (cabeça, tronco, pernas, braço direito, braço esquerdo). */
export const MOCORONGO_PIECES = ['mocorongo_thy', 'mocorongo_wisley', 'mocorongo_douglas', 'mocorongo_danilo', 'mocorongo_vitor'] as const;

const PIECES: readonly string[] = MOCORONGO_PIECES;

interface PieceOpts {
  id: (typeof MOCORONGO_PIECES)[number];
  name: string;
  /** Parte do corpo do Devs Mocorongos ("A cabeça", "O braço direito"…). */
  part: string;
  flavor: string;
  /** Fala do log quando é invocado e chama outro Mocorongo. */
  call: string;
}

/** Peças que o jogador já tem (mão ou campo): a busca traz uma que ainda falta. */
function owned(ctx: EffectCtx): Set<string> {
  const p = ctx.s.players[ctx.me];
  return new Set([...p.hand.map((c) => c.cardId), ...p.pros.flatMap((x) => (x ? [x.card.cardId] : []))]);
}

/**
 * Uma peça dos Devs Mocorongos: fraca sozinha, mas com as 5 entre a mão e o campo o dono reúne o
 * time (ação `fusion`) e vence o duelo. Invocada, chama outra peça do deck para a mão (1x por turno);
 * destruída, volta para a mão (1x por duelo). Calibrado com `npm run balance` (deck Mocorongos ≈ 50%).
 */
export function mocorongoPiece(o: PieceOpts): CardModule {
  return defineCard({
    def: {
      id: o.id,
      name: o.name,
      kind: 'pro',
      rarity: 'rara',
      typeLine: 'Humano / Mocorongo',
      attribute: 'TREVA',
      level: 3,
      atk: 800,
      def: 1000,
      unique: true,
      tags: ['mocorongo'],
      art: `/art/${o.id}.webp`,
      text:
        `${o.part} dos Devs Mocorongos. Com as 5 peças (Thy, Wisley, Douglas, Danilo e Vitor EAD Mocorongo) entre a sua mão e o seu campo, ` +
        'na sua Fase Principal você pode reuni-las: invoque "Devs Mocorongos" e vença o duelo. ' +
        'Chama a squad (1x por turno): ao ser invocado, adicione do deck à mão 1 peça Mocorongo que você ainda não tem. ' +
        'Home office (1x por duelo, contando as 5 peças): quando é destruído, volta do cemitério para a sua mão.',
      flavor: o.flavor,
    },
    effects: {
      onSummon(ctx) {
        const p = ctx.s.players[ctx.me];
        if (isOnce(p.oncePerTurn, 'mocorongoChama', ctx.s.turn)) return;
        const have = owned(ctx);
        if (!p.deck.some((c) => PIECES.includes(c.cardId) && !have.has(c.cardId))) return;
        markOnce(p.oncePerTurn, 'mocorongoChama', ctx.s.turn);
        log(ctx.s, 'effect', o.call, { seat: ctx.me, cardId: o.id });
        searchDeck(ctx.s, ctx.me, (id) => PIECES.includes(id) && !have.has(id));
      },
      onDestroyed(ctx) {
        const p = ctx.s.players[ctx.me];
        // 1x por duelo: a marca fica no jogador para sempre e vale para as 5 peças juntas.
        if (p.oncePerTurn.mocorongoHomeOffice !== undefined) return;
        const gi = p.grave.findIndex((c) => c.iid === ctx.self.iid);
        if (gi < 0) return;
        markOnce(p.oncePerTurn, 'mocorongoHomeOffice', ctx.s.turn);
        p.hand.push(...p.grave.splice(gi, 1));
        log(ctx.s, 'effect', `${o.name} foi pro home office: voltou para a mão de ${p.name}.`, { seat: ctx.me, cardId: o.id });
      },
    },
  });
}
