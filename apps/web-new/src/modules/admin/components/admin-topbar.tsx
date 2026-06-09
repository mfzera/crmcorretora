
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from '@tanstack/react-router';
import { Link } from '@tanstack/react-router';
import {
  LayoutDashboard,
  Building2,
  Tags,
  CreditCard,
  GraduationCap,
  BookOpen,
  Map,
  Archive,
  FileText,
  UserCircle,
  LogOut,
  Search,
  Menu,
  type LucideIcon,
} from 'lucide-react';
import { adminAuth } from '@/infra/auth/admin-auth';
import { cn } from '@/core/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/core/ui/dropdown-menu';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/core/ui/avatar';
import { CommandPalette } from '@/modules/admin/components/command-palette';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  permission?: string;
  /** marks a submenu that covers multiple routes */
  match?: (path: string) => boolean;
}

const PRIMARY: NavItem[] = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Corretoras', href: '/admin/tenants', icon: Building2, permission: 'manage_tenants' },
  { label: 'Preço', href: '/admin/pricing', icon: Tags },
  { label: 'Faturamento', href: '/admin/subscriptions', icon: CreditCard, permission: 'manage_tenants' },
  {
    label: 'Treinamentos',
    href: '/admin/treinamentos',
    icon: GraduationCap,
    match: (p) => p.startsWith('/admin/treinamentos'),
  },
];

const SECONDARY: NavItem[] = [
  { label: 'Changelogs', href: '/admin/changelogs', icon: BookOpen },
  { label: 'Roadmap', href: '/admin/roadmap', icon: Map },
  { label: 'Backups', href: '/admin/backups', icon: Archive, permission: 'manage_backups' },
  { label: 'Auditoria', href: '/admin/audit-logs', icon: FileText, permission: 'view_audit_logs' },
];

function initials(name?: string) {
  if (!name) return 'A';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export function AdminTopbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<ReturnType<typeof adminAuth.getUser>>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    setUser(adminAuth.getUser());

    const sync = () => setUser(adminAuth.getUser());
    window.addEventListener('admin-user-updated', sync);
    return () => window.removeEventListener('admin-user-updated', sync);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleLogout = async () => {
    await adminAuth.logout();
    navigate({ to: '/admin/login' });
  };

  const { primaryVisible, secondaryVisible } = useMemo(() => {
    if (!mounted) {
      return { primaryVisible: [] as NavItem[], secondaryVisible: [] as NavItem[] };
    }
    return {
      primaryVisible: PRIMARY.filter(
        (item) => !item.permission || adminAuth.hasPermission(item.permission),
      ),
      secondaryVisible: SECONDARY.filter(
        (item) => !item.permission || adminAuth.hasPermission(item.permission),
      ),
    };
  }, [mounted]);

  const isActive = (item: NavItem) =>
    item.match ? item.match(pathname) : pathname === item.href;

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-13 w-full max-w-[1400px] items-center gap-6 px-6">
          {/* Navegação primária (tabs) */}
          <nav className="hidden items-center gap-5 md:flex">
            {primaryVisible.map((item) => {
              const active = isActive(item);
              return (
                <Link
                  key={item.href}
                  to={item.href as any}
                  className={cn(
                    'text-sm transition-colors',
                    active
                      ? 'font-medium text-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Menu secundário (mais páginas) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="hidden h-7 items-center justify-center rounded px-2 text-muted-foreground transition-colors hover:text-foreground md:inline-flex"
              >
                <Menu className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                Mais
              </DropdownMenuLabel>
              {secondaryVisible.map((item) => {
                const Icon = item.icon;
                return (
                  <DropdownMenuItem
                    key={item.href}
                    onSelect={() => navigate({ to: item.href })}
                    className={cn(isActive(item) && 'bg-accent text-accent-foreground')}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {item.label}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile nav (primário + secundário no dropdown) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex h-7 items-center justify-center rounded px-2 text-muted-foreground md:hidden"
              >
                <Menu className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {[...primaryVisible, ...secondaryVisible].map((item) => {
                const Icon = item.icon;
                return (
                  <DropdownMenuItem
                    key={item.href}
                    onSelect={() => navigate({ to: item.href })}
                    className={cn(isActive(item) && 'bg-accent text-accent-foreground')}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {item.label}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex-1" />

          {/* Search / Command palette trigger */}
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="hidden h-8 items-center gap-2 rounded-md border border-border/50 bg-[var(--admin-surface-elevated)] px-3 text-xs text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
          >
            <Search className="h-3.5 w-3.5" />
            <span>Buscar...</span>
            <kbd className="ml-1 hidden rounded border border-border/50 px-1 py-0.5 text-[10px] text-muted-foreground/70 md:inline">
              ⌘K
            </kbd>
          </button>

          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground sm:hidden"
            aria-label="Buscar"
          >
            <Search className="h-4 w-4" />
          </button>

          {/* Avatar + dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-2.5 rounded-md px-1.5 py-1 transition-colors hover:bg-[var(--admin-surface-elevated)]"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.avatarUrl ?? undefined} alt={user?.nome} />
                  <AvatarFallback className="bg-primary text-[11px] font-semibold text-primary-foreground">
                    {initials(user?.nome)}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden text-left md:block">
                  <p className="text-xs font-medium leading-none text-foreground">
                    {mounted ? user?.nome ?? '—' : '—'}
                  </p>
                  <p className="text-[10px] leading-none text-muted-foreground mt-0.5">
                    CTO
                  </p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user?.nome ?? '—'}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email ?? ''}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => navigate({ to: '/admin/perfil' })}>
                <UserCircle className="mr-2 h-4 w-4" />
                Perfil
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={handleLogout}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </>
  );
}
