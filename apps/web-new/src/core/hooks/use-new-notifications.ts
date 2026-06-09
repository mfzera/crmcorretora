
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useNotificacoesNaoLidas } from '@/modules/notificacoes/http';
import { playNotificationSound } from './use-notification-sound';

export function useNewNotifications() {
  const { data: count = 0 } = useNotificacoesNaoLidas();
  const prevCount = useRef<number | undefined>(undefined);
  const isFirstRun = useRef(true);

  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      prevCount.current = count;
      return;
    }

    if (prevCount.current !== undefined && count > prevCount.current) {
      const diff = count - prevCount.current;
      playNotificationSound('media');
      toast('Nova notificação', {
        description:
          diff === 1
            ? 'Você tem uma nova notificação'
            : `Você tem ${diff} novas notificações`,
        duration: 5000,
      });
    }

    prevCount.current = count;
  }, [count]);
}
