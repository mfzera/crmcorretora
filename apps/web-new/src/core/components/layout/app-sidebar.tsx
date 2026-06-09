
import * as React from 'react';
import { Link } from '@tanstack/react-router';
import { useLocation } from '@tanstack/react-router';
import { NotificationsButton } from '../layout/notifications-button';

import { useThemeStore } from '@/infra/providers/theme-provider';
import {
  Home,
  ChevronsUpDown,
  ChevronRight,
  KanbanSquare,
  MessagesSquare,
  Moon,
  Sun,
  Users,
  Briefcase,
  BarChart3,
  Trophy,
  CheckCircle2,
  UserCircle,
  Settings,
  Upload,
  Package,
  Bell,
  Shield,
  Building2,
  CalendarDays,
  LayoutDashboard,
  Settings2,
  ShieldCheck,
  ClipboardList,
  Megaphone,
  ExternalLink,
  Target,
  RefreshCcw,
  UsersRound,
  ShieldAlert,
  Crown,
  Lock,
  TrendingUp,
} from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/core/ui/avatar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/core/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/core/ui/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarHeader,
  SidebarTrigger,
  useSidebar,
} from '@/core/ui/sidebar';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/core/ui/tooltip';
import { useAuthStore, type User } from '@/infra/auth/auth-store';
import { LucideIcon } from 'lucide-react';
import { SidebarMissoesPanel } from './sidebar-missoes-panel';
import { useCanais } from '@/modules/chat/http';
import { useModulos, type ModuloSlug } from '@/modules/corretora-config/http';

const MODULO_NAMES: Record<string, string> = {
  crm: 'CRM',
  sinistros: 'Sinistros',
  gamificacao: 'Gamificação',
};

// Tipo para seção da sidebar
type SidebarSection = {
  title: string;
  icon: LucideIcon;
  /** Módulo obrigatório para a seção inteira aparecer */
  modulo?: ModuloSlug;
  /** Injetado em runtime: módulo inativo mas visível como bloqueado */
  locked?: boolean;
  /** Separador visual acima desta seção */
  dividerBefore?: boolean;
  items: {
    title: string;
    url: string;
    icon: LucideIcon;
    permission: string;
    /** Módulo obrigatório para o item aparecer */
    modulo?: ModuloSlug;
    /** Item visível apenas para usuários com estes papéis (OR logic) */
    roles?: Array<'admin' | 'gestor' | 'liderEquipe' | 'vendedor'>;
    /** Ocultar item se o usuário já tem esta permissão (evita duplicação de menus) */
    excludeIfHasPermission?: string;
    /** @deprecated Visibilidade customizada — prefira roles + excludeIfHasPermission */
    visibleFn?: (user: User) => boolean;
    /** Injetado em runtime: módulo inativo mas visível como bloqueado */
    locked?: boolean;
  }[];
};

function evaluateSidebarItem(
  item: SidebarSection['items'][number],
  user: User,
  hasPermissionFn: (p: string) => boolean,
): boolean {
  if (item.visibleFn) return item.visibleFn(user);
  if (item.roles) {
    const roleMap: Record<string, boolean> = {
      admin: !!(user.isAdmin || user.cargo?.isAdmin),
      gestor: !!user.isGestor,
      liderEquipe: !!user.isLiderEquipe,
      vendedor: !!user.isVendedor,
    };
    const hasRole = item.roles.some((r) => roleMap[r]);
    if (!hasRole) return false;
  }
  if (item.excludeIfHasPermission && hasPermissionFn(item.excludeIfHasPermission)) return false;
  return hasPermissionFn(item.permission);
}

// Seções da sidebar com seus itens e permissões
const sidebarSections: SidebarSection[] = [
  {
    title: 'Centro',
    icon: LayoutDashboard,
    items: [
      {
        title: 'Visão Geral',
        url: '/dashboard',
        icon: Home,
        permission: 'dashboard:visualizar',
      },
      {
        title: 'Notificações',
        url: '/notificacoes',
        icon: Bell,
        permission: 'dashboard:visualizar',
      },
      {
        title: 'Agenda',
        url: '/agenda',
        icon: CalendarDays,
        permission: 'dashboard:visualizar',
      },
      {
        title: 'Área de Trabalho',
        url: '/workspace2',
        icon: Briefcase,
        permission: 'workspace:acessar',
      },
      {
        title: 'Meu Desempenho',
        url: '/meu-desempenho',
        icon: Trophy,
        permission: 'workspace:acessar',
        modulo: 'gamificacao' as ModuloSlug,
      },
      {
        title: 'Ranking',
        url: '/ranking',
        icon: Crown,
        permission: 'workspace:acessar',
        modulo: 'gamificacao' as ModuloSlug,
      },
      {
        title: 'Kanban',
        url: '/dashboard/kanban',
        icon: KanbanSquare,
        permission: 'kanban:acessar',
      },
      {
        title: 'Chat Equipe',
        url: '/chat',
        icon: MessagesSquare,
        permission: 'chat:acessar',
      },
      {
        title: 'Clientes',
        url: '/clientes',
        icon: Users,
        permission: 'clientes:visualizar',
      },
    ],
  },
  {
    title: 'Gestão',
    icon: Settings2,
    items: [
      {
        title: 'CRM',
        url: '/crm',
        icon: Settings,
        permission: 'gestao_crm:acessar',
      },
      {
        title: 'Produtos & Seguradoras',
        url: '/produtos',
        icon: Package,
        permission: 'produtos:visualizar',
      },
      {
        title: 'Importar Renovações',
        url: '/importar-renovacoes',
        icon: Upload,
        permission: 'importar_renovacoes:acessar',
      },
      {
        title: 'Gestão',
        url: '/gestao',
        icon: Target,
        permission: 'gamificacao:gerenciar',
        modulo: 'gamificacao' as ModuloSlug,
      },
    ],
  },
  {
    title: 'Admin',
    icon: ShieldCheck,
    dividerBefore: true,
    items: [
      {
        title: 'Usuários',
        url: '/usuarios',
        icon: Users,
        permission: 'usuarios:visualizar',
      },
      {
        title: 'Negócios',
        url: '/negocios',
        icon: Building2,
        permission: 'negocios_corretora:acessar',
      },
      {
        title: 'Desempenho da Equipe',
        url: '/performance',
        icon: Trophy,
        permission: 'performance:visualizar',
      },
      {
        title: 'Métricas',
        url: '/metricas',
        icon: BarChart3,
        permission: 'metricas:acessar',
      },
      {
        title: 'Painel Geral',
        url: '/painel',
        icon: LayoutDashboard,
        permission: 'metricas:acessar',
      },
    ],
  },
  {
    title: 'Equipe',
    icon: UsersRound,
    items: [
      {
        title: 'Painel da Equipe',
        url: '/painel-equipe',
        icon: LayoutDashboard,
        permission: '',
        roles: ['gestor', 'liderEquipe'],
        excludeIfHasPermission: 'metricas:acessar',
      },
    ],
  },
  {
    title: 'Sinistros',
    icon: ShieldAlert,
    dividerBefore: true,
    modulo: 'sinistros' as ModuloSlug,
    items: [
      {
        title: 'Gestão',
        url: '/sinistro',
        icon: ShieldAlert,
        permission: 'sinistros:criar',
      },
      {
        title: 'Kanban',
        url: '/sinistro/kanban',
        icon: KanbanSquare,
        permission: 'sinistros:criar',
      },
    ],
  },
  {
    title: 'Cadastro',
    icon: ClipboardList,
    items: [
      {
        title: 'Cadastro',
        url: '/cadastro',
        icon: CheckCircle2,
        permission: 'cadastro:acessar',
      },
    ],
  },
  {
    title: 'Pós-Vendas',
    icon: TrendingUp,
    dividerBefore: true,
    items: [
      {
        title: 'Cross-Selling',
        url: '/pos-vendas/cross-selling',
        icon: KanbanSquare,
        permission: 'kanban:acessar',
      },
    ],
  },
];

function ThemeDropdownItem() {
  const { setTheme, resolvedTheme } = useThemeStore();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const isDark = resolvedTheme === 'dark';

  return (
    <DropdownMenuItem
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="cursor-pointer"
    >
      {isDark ? <Sun className="mr-2 h-4 w-4" aria-hidden="true" /> : <Moon className="mr-2 h-4 w-4" aria-hidden="true" />}
      {isDark ? 'Tema claro' : 'Tema escuro'}
    </DropdownMenuItem>
  );
}


function UserProfileDropdown() {
  const [mounted, setMounted] = React.useState(false);
  const { user, logout } = useAuthStore();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const handleSignOut = async () => {
    await logout();
    window.location.href = '/login';
  };

  if (!mounted || !user) {
    return (
      <SidebarMenuButton size="lg" disabled>
        <Avatar className="h-8 w-8 rounded-lg">
          <AvatarFallback className="rounded-lg">...</AvatarFallback>
        </Avatar>
        <div className="grid flex-1 text-left text-sm leading-tight">
          <span className="truncate font-semibold">Carregando...</span>
          <span className="truncate text-xs">...</span>
        </div>
        <ChevronsUpDown className="ml-auto size-4" />
      </SidebarMenuButton>
    );
  }

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton
          size="lg"
          className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
        >
          <Avatar className="h-8 w-8 rounded-lg">
            {user.avatarUrl && (
              <AvatarImage src={user.avatarUrl} alt={user.nome} />
            )}
            <AvatarFallback className="rounded-lg">
              {getInitials(user.nome)}
            </AvatarFallback>
          </Avatar>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">{user.nome}</span>
            <span className="truncate text-xs">{user.email}</span>
          </div>
          <ChevronsUpDown className="ml-auto size-4" aria-hidden="true" />
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
        side="bottom"
        align="end"
        sideOffset={4}
      >
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
            <Avatar className="h-8 w-8 rounded-lg">
              {user.avatarUrl && (
                <AvatarImage src={user.avatarUrl} alt={user.nome} />
              )}
              <AvatarFallback className="rounded-lg">
                {getInitials(user.nome)}
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">{user.nome}</span>
              <span className="truncate text-xs">{user.email}</span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/perfil" search={{ tab: undefined as unknown as string, google: undefined as unknown as string }} className="cursor-pointer">
            <UserCircle className="mr-2 h-4 w-4" aria-hidden="true" />
            Perfil
          </Link>
        </DropdownMenuItem>
        <ThemeDropdownItem />
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
          <span>Sair</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ChatUnreadBadge() {
  const { data } = useCanais();
  const total = data?.canais?.reduce((sum, canal) => sum + (canal.naoLidas ?? 0), 0) ?? 0;
  if (total === 0) return null;
  const label = total > 99 ? '99+' : total;
  return (
    <span
      className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-white"
      aria-label={`${label} mensagens não lidas`}
    >
      <span aria-hidden="true">{label}</span>
    </span>
  );
}

export function AppSidebar() {
  const { user } = useAuthStore();
  const modulos = useModulos();
  const location = useLocation()
  const pathname = location.pathname;
  const { isMobile, setOpenMobile, setOpen, state } = useSidebar();

  const handleNavClick = React.useCallback(() => {
    if (isMobile) setOpenMobile(false);
    else setOpen(false);
  }, [isMobile, setOpenMobile, setOpen]);

  const handleSidebarClick = React.useCallback(() => {
    if (state === 'collapsed') setOpen(true);
  }, [state, setOpen]);

  const isActive = React.useCallback((url: string): boolean => {
    if (!pathname) return false;
    if (url === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(url);
  }, [pathname]);

  const visibleSections = React.useMemo(() => {
    const hasPermission = (permission: string): boolean => {
      if (!user) return false;
      if (user.isAdmin || user.cargo?.isAdmin) return true;
      return user.permissoes?.includes(permission) ?? false;
    };

    const hasModulo = (modulo?: ModuloSlug): boolean => {
      if (!modulo) return true;
      return modulos.lista.includes(modulo);
    };

    const isItemLocked = (item: SidebarSection['items'][number]): boolean =>
      !!item.modulo && !hasModulo(item.modulo);

    // Retorna true se o item deve aparecer (acessível OU bloqueado com cadeado).
    // Items com roles/visibleFn nunca aparecem como bloqueados (lógica customizada demais).
    const isItemVisible = (item: SidebarSection['items'][number]): boolean => {
      if (!user) return false;
      if (!hasModulo(item.modulo)) {
        if (item.visibleFn || item.roles) return false;
        return hasPermission(item.permission);
      }
      return evaluateSidebarItem(item, user, hasPermission);
    };

    return sidebarSections
      .filter((section) => !!user)
      .map((section) => {
        const sectionLocked = !hasModulo(section.modulo);
        return {
          ...section,
          locked: sectionLocked,
          items: section.items
            .filter((item) => {
              // Seção locked: mostrar todos os itens sem visibleFn (contexto de upsell)
              if (sectionLocked) return !item.visibleFn;
              return isItemVisible(item);
            })
            .map((item) => ({
              ...item,
              locked: sectionLocked || isItemLocked(item),
            })),
        };
      })
      .filter((section) => section.items.length > 0);
  }, [user, modulos.lista]);

  return (
    <Sidebar
      collapsible="icon"
      onClick={handleSidebarClick}
      className={state === 'collapsed' ? 'cursor-pointer' : ''}
    >
      <SidebarHeader>
        <div className="flex items-center justify-between px-4 pt-3 pb-2 group-data-[collapsible=icon]:justify-center">
          <div className="group-data-[collapsible=icon]:hidden">
            <NotificationsButton />
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <SidebarTrigger />
            </TooltipTrigger>
            <TooltipContent side="right">
              <span>Ctrl + B</span>
            </TooltipContent>
          </Tooltip>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {modulos.gamificacao && <SidebarMissoesPanel />}
        <SidebarGroup role="navigation" aria-label="Navegação principal">
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleSections.map((section) => {
                const sectionIsActive = section.items.some((item) =>
                  isActive(item.url),
                );

                return (
                  <React.Fragment key={section.title}>
                    {section.dividerBefore && (
                      <li role="separator" aria-hidden="true" className="mx-2 my-1 h-px bg-sidebar-border" />
                    )}
                  <Collapsible
                    asChild
                    defaultOpen={sectionIsActive}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          tooltip={section.title}
                          className={section.locked ? 'font-medium text-muted-foreground' : 'font-medium'}
                          aria-disabled={section.locked || undefined}
                        >
                          <section.icon aria-hidden="true" />
                          <span>{section.title}</span>
                          {section.locked && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Lock className="size-3 text-muted-foreground" aria-hidden="true" />
                              </TooltipTrigger>
                              <TooltipContent side="right">
                                Módulo {MODULO_NAMES[section.modulo ?? ''] ?? section.modulo} não ativo no seu plano
                              </TooltipContent>
                            </Tooltip>
                          )}
                          <ChevronRight aria-hidden="true" className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {section.items.map((item) => (
                            <SidebarMenuSubItem key={item.title}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={!item.locked && isActive(item.url)}
                                className={item.locked ? 'text-muted-foreground' : undefined}
                              >
                                {item.locked ? (
                                  <span
                                    aria-disabled="true"
                                    className="flex w-full cursor-not-allowed items-center gap-1"
                                  >
                                    <span className="flex-1 truncate">{item.title}</span>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Lock className="size-3 flex-shrink-0 opacity-60" aria-hidden="true" />
                                      </TooltipTrigger>
                                      <TooltipContent side="right">
                                        Módulo {MODULO_NAMES[item.modulo ?? ''] ?? item.modulo} não ativo no seu plano
                                      </TooltipContent>
                                    </Tooltip>
                                  </span>
                                ) : (
                                  <Link
                                    to={item.url}
                                    onClick={handleNavClick}
                                    aria-current={isActive(item.url) ? 'page' : undefined}
                                    title={item.title}
                                    className="flex w-full items-center gap-1"
                                  >
                                    <span className="flex-1 truncate">{item.title}</span>
                                    {item.url === '/chat' && <ChatUnreadBadge />}
                                  </Link>
                                )}
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                  </React.Fragment>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <UserProfileDropdown />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
