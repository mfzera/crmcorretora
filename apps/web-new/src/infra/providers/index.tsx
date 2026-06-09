import { ReactNode } from 'react';
import { QueryProvider } from './query-provider';
import { ThemeProvider } from './theme-provider';
import { Toaster } from '@/core/ui/sonner';
import { TooltipProvider } from '@/core/ui/tooltip';
import { ThemeKeyboardShortcut } from '@/core/components/theme-keyboard-shortcut';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <TooltipProvider>
          <ThemeKeyboardShortcut />
          {children}
          <Toaster position="top-right" richColors />
        </TooltipProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
