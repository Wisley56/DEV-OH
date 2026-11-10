import type { Action, Attribute, BugTrigger, BugType, CardKind, EffectPart, Rarity, TargetKind, TaskSpeed } from '@devoh/engine';
import { z } from 'zod';
import type { CreateRoomPayload, JoinRoomPayload, RejoinRoomPayload, WatchMatchPayload } from './index';
import {
  MAX_DECKS,
  PASSWORD_MAX,
  PASSWORD_MIN,
  USERNAME_PATTERN,
  type ChangePasswordPayload,
  type DeckPayload,
  type LoginPayload,
  type RegisterPayload,
} from './account';
import type { ArtCropQuery, SaveCustomCardPayload } from './cards';

/** Schemas de validação dos payloads que chegam ao servidor. */

const iid = z.string().max(16);
const deck = z.array(z.string().max(40), { error: 'Deck inválido.' }).max(60, { error: 'Deck inválido.' });
const code = z.string().max(8);

export const CreateRoomSchema = z.object({ deck, private: z.boolean().optional() });
export const JoinRoomSchema = z.object({ code, deck });
export const RejoinRoomSchema = z.object({ code });
export const WatchMatchSchema = z.object({ matchId: z.string().max(24).nullable() });

const position = z.enum(['atk', 'def']);
const zone = z.number().int().min(0).max(9).optional();

export const ActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('summon'), iid, position, tributes: z.array(iid).max(3).optional(), target: iid.optional(), zone }),
  z.object({ type: z.literal('activate'), iid, target: iid.optional(), zone }),
  z.object({ type: z.literal('set'), iid, zone, tributes: z.array(iid).max(3).optional() }),
  z.object({ type: z.literal('flipSummon'), iid }),
  z.object({ type: z.literal('changePosition'), iid }),
  z.object({ type: z.literal('ignition'), iid, target: iid.optional() }),
  z.object({ type: z.literal('goBattle') }),
  z.object({ type: z.literal('attack'), iid, target: iid.optional() }),
  z.object({ type: z.literal('endTurn') }),
  z.object({ type: z.literal('surrender') }),
]);

// ── Contas, decks e ranking (HTTP) ──

const invalid = { error: 'Dados inválidos.' };

const username = z
  .string({ error: 'Informe o usuário.' })
  .trim()
  .toLowerCase()
  .regex(USERNAME_PATTERN, { error: 'Usuário: 3 a 20 letras minúsculas, números ou "_".' });
const password = z
  .string({ error: 'Informe a senha.' })
  .min(PASSWORD_MIN, { error: `A senha precisa de pelo menos ${PASSWORD_MIN} caracteres.` })
  .max(PASSWORD_MAX, { error: 'Senha longa demais.' });

export const RegisterSchema = z.object(
  {
    username,
    displayName: z.string({ error: 'Nome inválido.' }).max(64, { error: 'Nome longo demais.' }),
    password,
    turnstileToken: z
      .string({ error: 'Confirme que você não é um robô.' })
      .min(1, { error: 'Confirme que você não é um robô.' })
      .max(4096, { error: 'Confirme que você não é um robô.' }),
  },
  invalid,
);
// O login não revela as regras de formato: qualquer erro vira "usuário ou senha inválidos".
const invalidLogin = { error: 'Usuário ou senha inválidos.' };
export const LoginSchema = z.object(
  {
    username: z.string(invalidLogin).trim().toLowerCase().max(64, invalidLogin),
    password: z.string(invalidLogin).max(PASSWORD_MAX, invalidLogin),
  },
  invalid,
);
export const ChangePasswordSchema = z.object(
  {
    current: z.string({ error: 'Senha atual incorreta.' }).max(PASSWORD_MAX, { error: 'Senha atual incorreta.' }),
    next: password,
  },
  invalid,
);

export const DeckSchema = z.object(
  {
    id: z.string({ error: 'Deck inválido.' }).regex(/^[\w-]{1,40}$/, { error: 'Deck inválido.' }),
    name: z
      .string({ error: 'Dê um nome ao deck.' })
      .trim()
      .min(1, { error: 'Dê um nome ao deck.' })
      .max(40, { error: 'Nome do deck longo demais.' }),
    description: z.string({ error: 'Descrição inválida.' }).max(200, { error: 'Descrição longa demais.' }),
    cards: deck,
  },
  invalid,
);
export const ImportDecksSchema = z
  .array(DeckSchema, { error: 'Decks inválidos.' })
  .max(MAX_DECKS, { error: `No máximo ${MAX_DECKS} decks por conta.` });

// ── Cards do painel admin (HTTP) ──
// Aqui só a forma e os tetos de tamanho: um rascunho pode estar incompleto. A regra completa
// (validateCustomInput + tabela de balanceamento) roda no servidor ao publicar.

const KINDS = ['pro', 'task', 'bug'] as const satisfies readonly CardKind[];
const RARITIES = ['comum', 'rara', 'super', 'ultra', 'secreta'] as const satisfies readonly Rarity[];
const ATTRIBUTES = ['TREVA', 'AGUA', 'TERRA', 'FOGO', 'LUZ', 'TECH'] as const satisfies readonly Attribute[];
const SPEEDS = ['normal', 'continuous', 'field', 'quick', 'equip'] as const satisfies readonly TaskSpeed[];
const BUG_TYPES = ['normal', 'continuous', 'counter'] as const satisfies readonly BugType[];
const BUG_TRIGGERS = [
  'oppSummon',
  'oppAttack',
  'oppDirectAttack',
  'oppTask',
  'battleDamage',
  'proDestroyedByBattle',
  'oppBug',
] as const satisfies readonly BugTrigger[];
const TARGETS = ['ownPro', 'oppPro', 'anyPro', 'oppSet'] as const satisfies readonly TargetKind[];

const cardText = (max: number) => z.string({ error: 'Texto inválido.' }).max(max, { error: `Texto com mais de ${max} caracteres.` });
const stat = z.number().int().min(0).max(3000);
/** Cada bloco de efeito: objeto pequeno; a estrutura é conferida pelo engine (dsl/validate). */
const effectPart = z.custom<EffectPart>((v) => !!v && typeof v === 'object' && !Array.isArray(v) && JSON.stringify(v).length <= 2000, {
  error: 'Efeito inválido.',
});

export const CustomCardInputSchema = z
  .object(
    {
      id: z
        .string({ error: 'Id inválido.' })
        .regex(/^x_[a-z0-9_]{2,36}$/, { error: 'O id precisa começar com "x_" e ter só letras minúsculas, números e "_".' }),
      name: cardText(40),
      kind: z.enum(KINDS, { error: 'Tipo de card inválido.' }),
      rarity: z.enum(RARITIES, { error: 'Raridade inválida.' }),
      typeLine: cardText(40).optional(),
      lore: cardText(300).optional(),
      flavor: cardText(200).optional(),
      unique: z.boolean().optional(),
      tags: z.array(cardText(20)).max(5).optional(),
      attribute: z.enum(ATTRIBUTES).optional(),
      level: z.number().int().min(1).max(10).optional(),
      atk: stat.optional(),
      def: stat.optional(),
      speed: z.enum(SPEEDS).optional(),
      bugType: z.enum(BUG_TYPES).optional(),
      trigger: z.enum(BUG_TRIGGERS).optional(),
      target: z.enum(TARGETS).optional(),
      effects: z.array(effectPart).max(3, { error: 'No máximo 3 blocos de efeito.' }).optional(),
    },
    invalid,
  )
  .strict();

export const SaveCustomCardSchema = z.object({ input: CustomCardInputSchema, version: z.number().int().positive().optional() }, invalid);

const px = z.coerce.number({ error: 'Recorte inválido.' }).int({ error: 'Recorte inválido.' }).min(0, { error: 'Recorte inválido.' });
/** Recorte opcional: sem os quatro números, a imagem inteira vai sobre o fundo desfocado. */
export const ArtCropSchema = z
  .object({ left: px, top: px, width: px.min(1), height: px.min(1) }, { error: 'Recorte inválido.' })
  .optional();

// Garante em tempo de compilação que os schemas batem com os tipos do contrato.
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
export const _contract: [
  Same<z.infer<typeof ActionSchema>, Action>,
  Same<z.infer<typeof CreateRoomSchema>, CreateRoomPayload>,
  Same<z.infer<typeof JoinRoomSchema>, JoinRoomPayload>,
  Same<z.infer<typeof RejoinRoomSchema>, RejoinRoomPayload>,
  Same<z.infer<typeof WatchMatchSchema>, WatchMatchPayload>,
  Same<z.infer<typeof RegisterSchema>, RegisterPayload>,
  Same<z.infer<typeof LoginSchema>, LoginPayload>,
  Same<z.infer<typeof ChangePasswordSchema>, ChangePasswordPayload>,
  Same<z.infer<typeof DeckSchema>, DeckPayload>,
  Same<z.infer<typeof SaveCustomCardSchema>, SaveCustomCardPayload>,
  Same<NonNullable<z.infer<typeof ArtCropSchema>>, ArtCropQuery>,
] = [true, true, true, true, true, true, true, true, true, true, true];
