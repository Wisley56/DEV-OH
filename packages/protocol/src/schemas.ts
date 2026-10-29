import type { Action } from '@devoh/engine';
import { z } from 'zod';
import type { CreateRoomPayload, JoinRoomPayload, RejoinRoomPayload } from './index';

/** Schemas de validação dos payloads que chegam ao servidor. */

const iid = z.string().max(16);
const name = z.string().max(64).optional();
const deck = z.array(z.string().max(40), { error: 'Deck inválido.' }).max(60, { error: 'Deck inválido.' });
const code = z.string().max(8);

export const CreateRoomSchema = z.object({ name, deck, private: z.boolean().optional() });
export const JoinRoomSchema = z.object({ code, name, deck });
export const RejoinRoomSchema = z.object({ code, token: z.string().max(64) });

const position = z.enum(['atk', 'def']);
const zone = z.number().int().min(0).max(9).optional();

export const ActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('summon'), iid, position, tributes: z.array(iid).max(3).optional(), target: iid.optional(), zone }),
  z.object({ type: z.literal('activate'), iid, target: iid.optional(), zone }),
  z.object({ type: z.literal('set'), iid, zone }),
  z.object({ type: z.literal('changePosition'), iid }),
  z.object({ type: z.literal('ignition'), iid, target: iid.optional() }),
  z.object({ type: z.literal('goBattle') }),
  z.object({ type: z.literal('attack'), iid, target: iid.optional() }),
  z.object({ type: z.literal('endTurn') }),
  z.object({ type: z.literal('surrender') }),
]);

// Garante em tempo de compilação que os schemas batem com os tipos do contrato.
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
export const _contract: [
  Same<z.infer<typeof ActionSchema>, Action>,
  Same<z.infer<typeof CreateRoomSchema>, CreateRoomPayload>,
  Same<z.infer<typeof JoinRoomSchema>, JoinRoomPayload>,
  Same<z.infer<typeof RejoinRoomSchema>, RejoinRoomPayload>,
] = [true, true, true, true];
