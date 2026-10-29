import type { BotLevel } from '@devoh/ai';
import { STARTER_DECKS } from '@devoh/engine';
import { DEFAULT_NAME, sanitizeName } from '@devoh/protocol';
import { create } from 'zustand';
import { readJson, STORAGE_KEYS, writeJson } from '../../../shared/lib/storage';

interface ProfileState {
  /** Apelido como foi salvo (pode estar vazio). */
  name: string;
  /** Deck escolhido para jogar. */
  deckId: string;
  botLevel: BotLevel;
  /** Sons do duelo ligados. */
  sound: boolean;
  setName(name: string): void;
  setDeckId(id: string): void;
  setBotLevel(level: BotLevel): void;
  setSound(on: boolean): void;
}

/** Preferências do jogador neste navegador (localStorage, mesmas chaves da v1). */
export const useProfile = create<ProfileState>((set) => ({
  name: readJson(STORAGE_KEYS.name, ''),
  deckId: readJson(STORAGE_KEYS.deck, STARTER_DECKS[0].id),
  botLevel: readJson<BotLevel>(STORAGE_KEYS.botLevel, 'normal'),
  sound: readJson(STORAGE_KEYS.sound, true),
  setName(name) {
    writeJson(STORAGE_KEYS.name, name);
    set({ name });
  },
  setDeckId(deckId) {
    writeJson(STORAGE_KEYS.deck, deckId);
    set({ deckId });
  },
  setBotLevel(botLevel) {
    writeJson(STORAGE_KEYS.botLevel, botLevel);
    set({ botLevel });
  },
  setSound(sound) {
    writeJson(STORAGE_KEYS.sound, sound);
    set({ sound });
  },
}));

export const DEFAULT_NICK = DEFAULT_NAME;

/** Apelido para exibir/enviar: o salvo, limpo, ou o padrão (a mesma regra do servidor). */
export const nickOf = (name: string) => sanitizeName(name, DEFAULT_NICK);
