
import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { LogIn, Clock } from 'lucide-react';
import { Button } from '@/core/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/core/ui/dialog';
import { useAuthStore } from '@/infra/auth/auth-store';
import { refreshToken } from '@/modules/auth/http';

export function SessionExpiredModal() {
  const navigate = useNavigate();
  const { sessionExpired, clearSessionExpired, resetSessionExpired, setToken, refreshToken: storedRefreshToken } = useAuthStore();
  const [attempting, setAttempting] = useState(false);

  // Tenta renovar o token silenciosamente antes de forçar logout
  useEffect(() => {
    if (!sessionExpired || attempting) return;
    if (!storedRefreshToken) return;
    setAttempting(true);
    refreshToken(storedRefreshToken)
      .then(({ token: newToken, refreshToken: newRefreshToken, permissoes }) => {
        setToken(newToken);
        if (Array.isArray(permissoes)) useAuthStore.getState().setUser({ permissoes });
        if (newRefreshToken) useAuthStore.getState().setAuth(useAuthStore.getState().user!, newToken, newRefreshToken);
        resetSessionExpired();
      })
      .catch(() => {
        // Refresh falhou — manter modal visível para o usuário fazer login
      })
      .finally(() => setAttempting(false));
  }, [sessionExpired]);

  function handleLogin() {
    clearSessionExpired();
    navigate({ to: '/login', search: { redirect: '' } });
  }

  return (
    <Dialog open={sessionExpired && !attempting}>
      <DialogContent
        className="sm:max-w-md"
        onInteractOutside={(e) => e.preventDefault()}
        showCloseButton={false}
      >
        <DialogHeader className="items-center text-center">
          <div className="mb-2 flex size-14 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
            <Clock className="size-7" />
          </div>
          <DialogTitle className="text-xl">Sessão expirada</DialogTitle>
          <DialogDescription className="text-base">
            Sua sessão expirou por inatividade. Faça login novamente para
            continuar.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-2 sm:justify-center">
          <Button onClick={handleLogin} className="w-full sm:w-auto" size="lg">
            <LogIn className="mr-2 size-4" />
            Fazer login novamente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
