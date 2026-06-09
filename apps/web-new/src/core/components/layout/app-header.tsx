
import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Search, Building2, ChevronDown, ShieldCheck } from 'lucide-react';
import { Button } from '@/core/ui/button';
import { Badge } from '@/core/ui/badge';
import { Input } from '@/core/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/core/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/core/ui/tooltip';
import { useAuthStore } from '@/infra/auth/auth-store';
import { ThemeToggle } from '@/core/components/theme-toggle';
import { NotificationsButton } from './notifications-button';
import { SelectCorretoraDialog } from '@/modules/auth/components/select-corretora-dialog';
import { useCorretoras, useSwitchCorretora } from '@/modules/corretoras/http';
import { toast } from 'sonner';
import { handleApiError } from '@/core/utils/handle-api-error';

export function AppHeader() {
  const { user } = useAuthStore();
  const [showCorretoraDialog, setShowCorretoraDialog] = useState(false);
  const { data: corretoras = [], isLoading: isLoadingCorretoras } =
    useCorretoras();
  const { mutate: switchCorretora, isPending: isSwitching } =
    useSwitchCorretora();

  const corretoraAtiva = corretoras.find((c) => c.ativa);
  const temMultiplasCorretoras = corretoras.length > 1;

  const handleSelectCorretora = (corretoraId: string) => {
    switchCorretora(corretoraId, {
      onSuccess: () => {
        toast.success('Corretora alterada com sucesso!');
        setShowCorretoraDialog(false);
      },
      onError: (error: unknown) => {
        toast.error(handleApiError(error));
      },
    });
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background px-6">
      <div className="flex items-center gap-4">
        {/* Botão de trocar corretora - só aparece se houver múltiplas */}
        {temMultiplasCorretoras && corretoraAtiva && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setShowCorretoraDialog(true)}
          >
            <Building2 className="h-4 w-4" />
            <span className="hidden md:inline">
              {corretoraAtiva.nomeFantasia || corretoraAtiva.razaoSocial}
            </span>
            <ChevronDown className="h-3 w-3" />
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Search - Desktop */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar..."
            className="w-64 pl-9 h-9"
          />
        </div>

        {/* Search - Mobile */}
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Buscar">
          <Search className="size-5" />
        </Button>

        {/* Notifications */}
        <NotificationsButton />

        {/* Admin badge */}
        {user?.isAdmin && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="hidden md:flex items-center gap-1 border-primary/40 text-primary cursor-default select-none">
                  <ShieldCheck className="size-3" />
                  Admin
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>Você tem acesso total ao sistema</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                {user?.nome?.charAt(0).toUpperCase() || 'U'}
              </div>
              <span className="hidden text-sm font-medium md:inline-block">
                {user?.nome?.split(' ')[0]}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              <div>
                <p className="text-sm font-medium">{user?.nome}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Meu Perfil</DropdownMenuItem>
            {user?.isAdmin && (
              <DropdownMenuItem asChild>
                <Link to="/configuracoes/corretora">
                  Configurações da Corretora
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Dialog de seleção de corretora */}
      <SelectCorretoraDialog
        open={showCorretoraDialog}
        corretoras={corretoras}
        onSelect={handleSelectCorretora}
        isLoading={isSwitching}
      />
    </header>
  );
}
