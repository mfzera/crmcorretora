import { useEffect } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
}

function getResolved(theme: Theme): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return theme === 'system'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    : theme;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'system' as Theme,
      // Dado normal (não getter) — compatível com Object.assign do Zustand.
      // Atualizado junto com theme em setTheme e quando o sistema muda.
      resolvedTheme: getResolved('system'),
      setTheme: (theme) => set({ theme, resolvedTheme: getResolved(theme) }),
    }),
    {
      name: 'theme-storage',
      // Persiste só theme; resolvedTheme é derivado e recalculado no boot.
      partialize: (state) => ({ theme: state.theme }),
    },
  ),
);

// Rehidrata sincronamente antes do primeiro render para que o useEffect
// do ThemeProvider veja o tema correto do localStorage desde o início,
// evitando o flash dark→light→dark (ou vice-versa).
if (typeof window !== 'undefined') {
  useThemeStore.persist.rehydrate();
}

function applyTheme(theme: Theme) {
  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', isDark);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useThemeStore();

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      applyTheme('system');
      // Mantém resolvedTheme no store em sincronia quando o OS muda.
      useThemeStore.setState({ resolvedTheme: getResolved('system') });
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  return <>{children}</>;
}
