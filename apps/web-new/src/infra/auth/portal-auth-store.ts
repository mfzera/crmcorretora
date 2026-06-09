import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface PortalCliente {
  clienteId: string;
  nome: string;
  tipoPessoa: 'PF' | 'PJ';
  corretoraId: string;
}

export interface PortalCorretora {
  nomeFantasia: string | null;
  subdominio: string;
}

interface PortalAuthState {
  cliente: PortalCliente | null;
  corretora: PortalCorretora | null;
  token: string | null;
  isAuthenticated: boolean;
  setPortalAuth: (
    cliente: PortalCliente,
    corretora: PortalCorretora,
    token: string,
  ) => void;
  portalLogout: () => void;
}

export const usePortalAuthStore = create<PortalAuthState>()(
  persist(
    (set) => ({
      cliente: null,
      corretora: null,
      token: null,
      isAuthenticated: false,

      setPortalAuth: (cliente, corretora, token) => {
        set({ cliente, corretora, token, isAuthenticated: true });
      },

      portalLogout: () => {
        set({ cliente: null, corretora: null, token: null, isAuthenticated: false });
      },
    }),
    {
      name: 'portal-auth-storage',
      partialize: (state) => ({
        cliente: state.cliente,
        corretora: state.corretora,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);

export function getPortalToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem('portal-auth-storage');
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.state?.token ?? null;
    }
  } catch {
    return null;
  }
  return null;
}
