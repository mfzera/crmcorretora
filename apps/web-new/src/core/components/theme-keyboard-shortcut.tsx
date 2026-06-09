
import { useEffect } from 'react';
import { useThemeStore } from '@/infra/providers/theme-provider';

/**
 * Componente que gerencia apenas o atalho de teclado para alternar tema
 * Deve ser montado no layout raiz para funcionar em todas as páginas
 */
export function ThemeKeyboardShortcut() {
  const { resolvedTheme, setTheme } = useThemeStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.altKey && e.key === 'l') {
        e.preventDefault();
        // Alterna entre claro e escuro
        const newTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [resolvedTheme, setTheme]);

  return null; // Componente invisível, apenas gerencia o listener
}
