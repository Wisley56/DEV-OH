import type { Action } from '@devoh/engine';
import { z } from 'zod';
import type { CreateRoomPayload, JoinRoomPayload, RejoinRoomPayload } from './index';
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

/** Schemas de validação dos payloads que chegam ao servidor. */

const iid = z.string().max(16);
const deck = z.array(z.string().max(40), { error: 'Deck inválido.' }).max(60, { error: 'Deck inválido.' });
const code = z.string().max(8);

export const CreateRoomSchema = z.object({ deck, private: z.boolean().optional() });
export const JoinRoomSchema = z.object({ code, deck });
export const RejoinRoomSchema = z.object({ code });

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

// Garante em tempo de compilação que os schemas batem com os tipos do contrato.
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
export const _contract: [
  Same<z.infer<typeof ActionSchema>, Action>,
  Same<z.infer<typeof CreateRoomSchema>, CreateRoomPayload>,
  Same<z.infer<typeof JoinRoomSchema>, JoinRoomPayload>,
  Same<z.infer<typeof RejoinRoomSchema>, RejoinRoomPayload>,
  Same<z.infer<typeof RegisterSchema>, RegisterPayload>,
  Same<z.infer<typeof LoginSchema>, LoginPayload>,
  Same<z.infer<typeof ChangePasswordSchema>, ChangePasswordPayload>,
  Same<z.infer<typeof DeckSchema>, DeckPayload>,
] = [true, true, true, true, true, true, true, true];
