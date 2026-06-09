
import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/core/ui/command';
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
  type LucideIcon,
} from 'lucide-react';
import { adminAuth } from '@/infra/auth/admin-auth';

interface PaletteRoute {
  label: string;
  href: string;
  icon: LucideIcon;
  permission?: string;
}

const ROUTES: PaletteRoute[] = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Corretoras', href: '/admin/tenants', icon: Building2, permission: 'manage_tenants' },
  { label: 'Preço', href: '/admin/pricing', icon: Tags },
  { label: 'Faturamento', href: '/admin/subscriptions', icon: CreditCard, permission: 'manage_tenants' },
  { label: 'Treinamentos', href: '/admin/treinamentos', icon: GraduationCap },
  { label: 'Changelogs', href: '/admin/changelogs', icon: BookOpen },
  { label: 'Roadmap', href: '/admin/roadmap', icon: Map },
  { label: 'Backups', href: '/admin/backups', icon: Archive, permission: 'manage_backups' },
  { label: 'Logs de Auditoria', href: '/admin/audit-logs', icon: FileText, permission: 'view_audit_logs' },
  { label: 'Perfil', href: '/admin/perfil', icon: UserCircle },
];

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const visibleRoutes = mounted
    ? ROUTES.filter((r) => !r.permission || adminAuth.hasPermission(r.permission))
    : ROUTES;

  const go = (href: string) => {
    onOpenChange(false);
    navigate({ to: href as any });
  };

  const handleLogout = async () => {
    onOpenChange(false);
    await adminAuth.logout();
    navigate({ to: '/admin/login' as any });
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title="Navegação rápida" description="Busque páginas e ações">
      <CommandInput placeholder="Buscar páginas, ações..." />
      <CommandList>
        <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
        <CommandGroup heading="Navegar">
          {visibleRoutes.map((route) => {
            const Icon = route.icon;
            return (
              <CommandItem
                key={route.href}
                value={route.label}
                onSelect={() => go(route.href)}
              >
                <Icon />
                {route.label}
              </CommandItem>
            );
          })}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Ações">
          <CommandItem value="Sair" onSelect={handleLogout}>
            <LogOut />
            Sair
            <CommandShortcut>⇧⌘Q</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
