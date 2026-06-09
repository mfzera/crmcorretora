
import { useState, useEffect } from 'react';
import {
  Loader2,
  Shield,
  CheckCircle,
  LayoutDashboard,
  ShoppingCart,
  FileText,
  Users,
  RefreshCw,
  BarChart3,
  FileBarChart,
  UserCog,
  UsersRound,
  Package,
  Settings,
  LucideIcon,
  LayoutGrid,
  Briefcase,
  Building2,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { handleApiError } from '@/core/utils/handle-api-error';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/core/ui/dialog';
import { Button } from '@/core/ui/button';
import { Checkbox } from '@/core/ui/checkbox';
import { Label } from '@/core/ui/label';
import { Badge } from '@/core/ui/badge';
import { useAssignPermissions, useCargo } from '@/modules/cargos/http';
import { usePermissoesDisponiveis } from '@/modules/permissoes/http';
import type { Cargo } from '@/types/cargo';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/core/ui/card';

interface PermissoesDialogProps {
  cargo: Cargo;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}

// Mapa de ícones e informações para cada grupo
const GRUPO_CONFIG: Record<
  string,
  {
    icon: LucideIcon;
    label: string;
    description: string;
    color: string;
  }
> = {
  dashboard: {
    icon: LayoutDashboard,
    label: 'Dashboard',
    description: 'Acesso ao painel principal e visualização de métricas',
    color: 'text-blue-600',
  },
  vendas: {
    icon: ShoppingCart,
    label: 'Vendas',
    description: 'Gestão de cotações, propostas e documentos de venda',
    color: 'text-green-600',
  },
  cadastro: {
    icon: FileText,
    label: 'Cadastro',
    description: 'Validação e aprovação de documentos e vendas',
    color: 'text-orange-600',
  },
  clientes: {
    icon: Users,
    label: 'Clientes',
    description: 'Gerenciamento da carteira de clientes',
    color: 'text-purple-600',
  },
  renovacoes: {
    icon: RefreshCw,
    label: 'Renovações',
    description: 'Controle do processo de renovação de apólices',
    color: 'text-cyan-600',
  },
  metricas: {
    icon: BarChart3,
    label: 'Métricas',
    description: 'Análise de desempenho e indicadores',
    color: 'text-pink-600',
  },
  relatorios: {
    icon: FileBarChart,
    label: 'Relatórios',
    description: 'Geração e exportação de relatórios',
    color: 'text-indigo-600',
  },
  usuarios: {
    icon: UserCog,
    label: 'Usuários',
    description: 'Gerenciamento de usuários do sistema',
    color: 'text-red-600',
  },
  cargos: {
    icon: Shield,
    label: 'Cargos',
    description: 'Criação e gestão de cargos e permissões',
    color: 'text-amber-600',
  },
  equipes: {
    icon: UsersRound,
    label: 'Equipes',
    description: 'Organização e gestão de equipes',
    color: 'text-teal-600',
  },
  produtos: {
    icon: Package,
    label: 'Produtos',
    description: 'Gerenciamento de produtos e seguradoras parceiras',
    color: 'text-lime-600',
  },
  configuracoes: {
    icon: Settings,
    label: 'Configurações',
    description: 'Configurações gerais do sistema',
    color: 'text-gray-600',
  },
  workspace: {
    icon: LayoutGrid,
    label: 'Workspace',
    description: 'Ferramentas de trabalho e colaboração',
    color: 'text-cyan-600',
  },
  gestao: {
    icon: Briefcase,
    label: 'Gestão',
    description: 'Ferramentas de gestão comercial e de pessoas',
    color: 'text-amber-600',
  },
  negocios: {
    icon: Building2,
    label: 'Negócios',
    description: 'Negócios e operações da corretora',
    color: 'text-emerald-600',
  },
  sinistros: {
    icon: AlertTriangle,
    label: 'Sinistros',
    description: 'Abertura, análise e aprovação de sinistros',
    color: 'text-rose-600',
  },
};

export function PermissoesDialog({
  cargo,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onSuccess,
}: PermissoesDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? controlledOnOpenChange! : setInternalOpen;

  const [permissoesSelecionadas, setPermissoesSelecionadas] = useState<
    Set<string>
  >(new Set());

  const { data: cargoDetalhado } = useCargo(open ? cargo.id : null);
  const { data: permissoesDisponiveis = {} } = usePermissoesDisponiveis();
  const atribuirPermissoes = useAssignPermissions();

  const isAdmin = cargo.isAdmin;

  // Carregar permissões atuais do cargo
  useEffect(() => {
    if (open && cargoDetalhado?.permissoes) {
      const permissoesIds = new Set(cargoDetalhado.permissoes.map((p) => p.id));
      setPermissoesSelecionadas(permissoesIds);
    }
  }, [open, cargoDetalhado]);

  const togglePermissao = (permissaoId: string) => {
    setPermissoesSelecionadas((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(permissaoId)) {
        newSet.delete(permissaoId);
      } else {
        newSet.add(permissaoId);
      }
      return newSet;
    });
  };

  const toggleGrupo = (grupo: string) => {
    const permissoesDoGrupo = permissoesDisponiveis[grupo] || [];
    const idsDoGrupo = permissoesDoGrupo.map((p) => p.id);
    const todasSelecionadas = idsDoGrupo.every((id) =>
      permissoesSelecionadas.has(id),
    );

    setPermissoesSelecionadas((prev) => {
      const newSet = new Set(prev);
      if (todasSelecionadas) {
        // Desmarcar todas do grupo
        idsDoGrupo.forEach((id) => newSet.delete(id));
      } else {
        // Marcar todas do grupo
        idsDoGrupo.forEach((id) => newSet.add(id));
      }
      return newSet;
    });
  };

  const handleSalvar = async () => {
    if (isAdmin) {
      toast.error('Não é possível editar permissões do cargo Administrador');
      return;
    }

    try {
      await atribuirPermissoes.mutateAsync({
        cargoId: cargo.id,
        permissaoIds: Array.from(permissoesSelecionadas),
      });
      toast.success('Permissões atualizadas com sucesso!');
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      toast.error(handleApiError(error));
    }
  };

  const gruposOrdenados = Object.keys(permissoesDisponiveis).sort();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Gerenciar Permissões - {cargo.nomeCargo}
          </DialogTitle>
          <DialogDescription>
            Selecione as permissões que os usuários com este cargo terão no
            sistema
          </DialogDescription>
        </DialogHeader>

        {isAdmin ? (
          <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Cargo Administrador
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  O cargo de Administrador possui todas as permissões do sistema
                  automaticamente. Não é possível editar suas permissões.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between py-2">
              <p className="text-sm text-muted-foreground">
                {permissoesSelecionadas.size} permissão(ões) selecionada(s)
              </p>
            </div>

            <div className="pr-4">
              <div className="space-y-6">
                {gruposOrdenados.map((grupo) => {
                  const permissoesDoGrupo = permissoesDisponiveis[grupo] || [];
                  const idsDoGrupo = permissoesDoGrupo.map((p) => p.id);
                  const todasSelecionadas = idsDoGrupo.every((id) =>
                    permissoesSelecionadas.has(id),
                  );
                  const algumasSelecionadas =
                    !todasSelecionadas &&
                    idsDoGrupo.some((id) => permissoesSelecionadas.has(id));
                  const grupoConfig = GRUPO_CONFIG[grupo];
                  const GrupoIcon = grupoConfig?.icon || Shield;

                  return (
                    <div key={grupo} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <GrupoIcon
                            className={`h-4 w-4 ${grupoConfig?.color || 'text-gray-600'}`}
                          />
                          <h3 className="text-sm font-semibold">
                            {grupoConfig?.label || grupo}
                          </h3>
                          <Badge variant="secondary" className="text-xs">
                            {permissoesDoGrupo.length}
                          </Badge>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleGrupo(grupo)}
                          className="h-8 text-xs"
                        >
                          {todasSelecionadas
                            ? 'Desmarcar Todas'
                            : 'Marcar Todas'}
                        </Button>
                      </div>
                      {grupoConfig?.description && (
                        <p className="text-xs text-muted-foreground pl-6">
                          {grupoConfig.description}
                        </p>
                      )}

                      <div className="grid grid-cols-1 gap-3 pl-6">
                        {permissoesDoGrupo.map((permissao) => (
                          <div
                            key={permissao.id}
                            className="flex items-start space-x-3 p-2 rounded-md hover:bg-muted/50 transition-colors"
                          >
                            <Checkbox
                              id={permissao.id}
                              checked={permissoesSelecionadas.has(permissao.id)}
                              onCheckedChange={() =>
                                togglePermissao(permissao.id)
                              }
                              disabled={atribuirPermissoes.isPending}
                            />
                            <div className="flex-1 space-y-1">
                              <Label
                                htmlFor={permissao.id}
                                className="text-sm font-medium leading-none cursor-pointer"
                              >
                                {permissao.nomePermissao}
                              </Label>
                              {permissao.descricao && (
                                <p className="text-xs text-muted-foreground">
                                  {permissao.descricao}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {gruposOrdenados.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Nenhuma permissão disponível</p>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={atribuirPermissoes.isPending}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSalvar}
                disabled={atribuirPermissoes.isPending}
              >
                {atribuirPermissoes.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Salvar Permissões
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
