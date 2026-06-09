import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  sub: string; // JWT subject (same as id, required by API)
  nome: string;
  email: string;
  avatarUrl?: string | null;
  corretoraId: string;
  corretoraSubdominio?: string | null;
  cargoId: string | null;
  isAdmin: boolean;
  isGestor: boolean;
  isVendedor: boolean;
  /** true quando o usuário é gestorId de alguma equipe, independente do cargo */
  isLiderEquipe: boolean;
  permissoes: string[];
  cargo?: {
    id: string;
    isAdmin: boolean;
    isGestor: boolean;
    isVendedor: boolean;
  } | null;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  sessionExpired: boolean;
  setAuth: (user: User, token: string, refreshToken?: string) => void;
  setToken: (token: string) => void;
  setUser: (user: Partial<User>) => void;
  updateUser: (user: User) => void;
  logout: () => void;
  triggerSessionExpired: () => void;
  clearSessionExpired: () => void;
  resetSessionExpired: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      sessionExpired: false,

      setAuth: (user, token, refreshToken) => {
        set({ user, token, refreshToken: refreshToken ?? null, isAuthenticated: true });
      },

      setToken: (token) => {
        set({ token });
      },

      setUser: (userData) => {
        const currentUser = get().user;
        if (currentUser) {
          set({ user: { ...currentUser, ...userData } });
        }
      },

      updateUser: (user) => {
        set({ user });
      },

      logout: () => {
        set({ user: null, token: null, refreshToken: null, isAuthenticated: false });
      },

      triggerSessionExpired: () => {
        set({ sessionExpired: true });
      },

      clearSessionExpired: () => {
        set({ user: null, token: null, refreshToken: null, isAuthenticated: false, sessionExpired: false });
      },

      resetSessionExpired: () => {
        set({ sessionExpired: false });
      },

    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
