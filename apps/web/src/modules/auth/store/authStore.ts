import type { AccountView, LoginPayload, RegisterPayload } from '@devoh/protocol';
import { useEffect } from 'react';
import { create } from 'zustand';
import { api } from '../../../shared/lib/api';

type AuthStatus = 'unknown' | 'guest' | 'user';

interface AuthState {
  /** 'unknown' até a primeira resposta de /auth/me. */
  status: AuthStatus;
  account: AccountView | null;
  /** Pergunta ao servidor quem está logado (pelo cookie). */
  load(): Promise<void>;
  login(input: LoginPayload): Promise<void>;
  register(input: RegisterPayload): Promise<void>;
  logout(): Promise<void>;
}

let loading: Promise<void> | null = null;

/** Conta logada. Guarda só os dados da conta: a sessão fica no cookie HttpOnly. */
export const useAuth = create<AuthState>((set) => ({
  status: 'unknown',
  account: null,
  load() {
    loading ??= api<AccountView | null>('/auth/me')
      .then((account) => set({ status: account ? 'user' : 'guest', account }))
      .catch((e: unknown) => {
        // Servidor fora do ar: segue como visitante (o treino funciona sem ele).
        console.warn('Conta indisponível:', (e as Error).message);
        set({ status: 'guest', account: null });
      })
      .finally(() => (loading = null));
    return loading;
  },
  async login(input) {
    set({ status: 'user', account: await api<AccountView>('/auth/login', { method: 'POST', body: input }) });
  },
  async register(input) {
    set({ status: 'user', account: await api<AccountView>('/auth/register', { method: 'POST', body: input }) });
  },
  async logout() {
    await api('/auth/logout', { method: 'POST' }).catch(() => {});
    set({ status: 'guest', account: null });
  },
}));

/** Conta logada (ou null); dispara a consulta na primeira vez. */
export function useAccount() {
  const { status, account, load } = useAuth();
  useEffect(() => {
    if (status === 'unknown') void load();
  }, [status, load]);
  return { status, account };
}
