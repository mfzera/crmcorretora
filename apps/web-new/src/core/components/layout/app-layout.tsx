
import { useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useNewNotifications } from '@/core/hooks/use-new-notifications';
import { BadgeCelebrationWatcher } from '@/modules/gamificacao/components/BadgeCelebration';
import { Menu } from 'lucide-react';
import { AppSidebar } from './app-sidebar';
import { useAuthStore } from '@/infra/auth/auth-store';
import { SidebarProvider, SidebarInset, SidebarTrigger, useSidebar } from '@/core/ui/sidebar';
import { SessionExpiredModal } from '@/modules/auth/components/session-expired-modal';
import { getMe, refreshToken } from '@/modules/auth/http';
import { hydrateManifest, fetchManifest } from '@/infra/http/permission-manifest';
import { useForbiddenRedirect } from '@/core/hooks/use-forbidden-redirect';
import { Avatar, AvatarFallback, AvatarImage } from '@/core/ui/avatar';
import { dayjs } from '@/core/utils/date-utils';

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export function AppLayout({ children, title }: AppLayoutProps) {
  const navigate = useNavigate();
  const { user, isAuthenticated, setUser, setToken, refreshToken: storedRefreshToken } = useAuthStore();

  useForbiddenRedirect();

  useEffect(() => {
    hydrateManifest();
  }, []);

  // Refresh JWT token and sync user data in background — does not block render.
  // hydrateManifest() above already seeds the permission gate from localStorage.
  useEffect(() => {
    if (!isAuthenticated) return;

    const syncSession = async () => {
      await fetchManifest();

      if (storedRefreshToken) {
        try {
          const { token: newToken, refreshToken: newRefreshToken, permissoes: freshPermissoes } = await refreshToken(storedRefreshToken);
          setToken(newToken);
          if (Array.isArray(freshPermissoes)) useAuthStore.getState().setUser({ permissoes: freshPermissoes });
          if (newRefreshToken) useAuthStore.getState().setAuth(useAuthStore.getState().user!, newToken, newRefreshToken);
        } catch {
          // Refresh failed — session will expire naturally
        }
      }

      try {
        const data: any = await getMe();
        const usuario = data?.usuario ?? data;
        const corretora = data?.corretora;
        const updates: Record<string, unknown> = {};
        if (usuario?.avatarUrl !== undefined) updates.avatarUrl = usuario.avatarUrl;
        if (corretora?.subdominio) updates.corretoraSubdominio = corretora.subdominio;
        if (Array.isArray(data?.permissoes)) updates.permissoes = data.permissoes;
        if (Object.keys(updates).length > 0) setUser(updates);
      } catch {
        // Ignore getMe errors
      }
    };

    syncSession();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate({ to: '/login', search: { redirect: window.location.pathname } });
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <SidebarProvider>
        <NotificationWatcher />
        <BadgeCelebrationWatcher />
        <AppSidebar />
        <SidebarInset className="h-svh overflow-hidden">
          <MobileHeader />
          <main className="flex-1 min-h-0 overflow-auto bg-muted/30">{children}</main>
        </SidebarInset>
      </SidebarProvider>
      <SessionExpiredModal />
    </>
  );
}

function NotificationWatcher() {
  useNewNotifications();
  return null;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

function getInitials(name: string): string {
  const parts = name.split(' ');
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

function MobileHeader() {
  const { user } = useAuthStore();
  const { toggleSidebar } = useSidebar();

  if (!user) return null;

  const firstName = user.nome?.split(' ')[0] || '';
  const now = dayjs();
  const dateStr = now.format('ddd[,] D [de] MMM · HH:mm');
  const dateFormatted = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

  return (
    <div className="flex md:hidden items-center justify-between px-4 py-3 border-b bg-background shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={toggleSidebar}
          className="shrink-0 flex items-center justify-center size-10 rounded-lg hover:bg-muted transition-colors"
          aria-label="Abrir menu"
        >
          <Menu className="size-5" />
        </button>
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">
            {getGreeting()}, {firstName}!
          </p>
          <p className="text-[11px] text-muted-foreground truncate">
            {dateFormatted}
          </p>
        </div>
      </div>
      <Avatar className="size-9 shrink-0">
        {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.nome} />}
        <AvatarFallback className="text-xs font-semibold">
          {getInitials(user.nome)}
        </AvatarFallback>
      </Avatar>
    </div>
  );
}
