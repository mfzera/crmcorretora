
import { useState, useTransition } from 'react';
import { Bell, BellRing } from 'lucide-react';
import { Button } from '@/core/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/core/ui/sheet';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { useNotificacoesNaoLidas } from '@/modules/notificacoes/http';
import { NotificationsPanel } from './notifications-list';
import { cn } from '@/core/utils';

export function NotificationsButton() {
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const { data: countNaoLidas = 0 } = useNotificacoesNaoLidas();

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => startTransition(() => setOpen(true))}
        title="Notificações"
      >
        {countNaoLidas > 0 ? (
          <BellRing className="h-5 w-5 text-primary" />
        ) : (
          <Bell className="h-5 w-5" />
        )}
        {countNaoLidas > 0 && (
          <span
            className={cn(
              'absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full',
              'bg-destructive text-[10px] font-bold text-white',
              'animate-pulse',
            )}
          >
            {countNaoLidas > 9 ? '9+' : countNaoLidas}
          </span>
        )}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="p-0 w-[400px] sm:max-w-[400px]">
          <VisuallyHidden>
            <SheetTitle>Notificações</SheetTitle>
          </VisuallyHidden>
          <NotificationsPanel onClose={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
