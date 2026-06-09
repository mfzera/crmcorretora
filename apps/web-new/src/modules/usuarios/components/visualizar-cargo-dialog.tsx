
import { useState } from 'react';
import {
  Shield,
  CheckCircle2,
  XCircle,
  Users,
  Briefcase,
  Loader2,
  LayoutDashboard,
  ShoppingCart,
  FileText,
  RefreshCw,
  BarChart3,
  FileBarChart,
  UserCog,
  UsersRound,
  Package,
  Settings,
  LucideIcon,
  LayoutGrid,
  Building2,
} from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/core/ui/dialog';
import { Badge } from '@/core/ui/badge';
import { Separator } from '@/core/ui/separator';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/core/ui/card';
import { useCargo } from '@/modules/cargos/http';
import type { Cargo } from '@/types/cargo';
import { cn } from '@/core/utils';

interface VisualizarCargoDialogProps {
  cargo: Cargo;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

// Configuração de ícones para cada grupo
const GRUPO_CONFIG: Record<
  string,
  {
    icon: LucideIcon;
    label: string;
    color: string;
    bgColor: string;
  }
> = {
  dashboard: {
    icon: LayoutDashboard,
    label: 'Dashboard',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-950/20',
  },
  vendas: {
    icon: ShoppingCart,
    label: 'Vendas',
    color: 'text-green-600',
    bgColor: 'bg-green-50 dark:bg-green-950/20',
  },
  cadastro: {
    icon: FileText,
    label: 'Cadastro',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 dark:bg-orange-950/20',
  },
  clientes: {
    icon: Users,
    label: 'Clientes',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 dark:bg-purple-950/20',
  },
  renovacoes: {
    icon: RefreshCw,
    label: 'Renovações',
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50 dark:bg-cyan-950/20',
  },
  metricas: {
    icon: BarChart3,
    label: 'Métricas',
    color: 'text-pink-600',
    bgColor: 'bg-pink-50 dark:bg-pink-950/20',
  },
  relatorios: {
    icon: FileBarChart,
    label: 'Relatórios',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50 dark:bg-indigo-950/20',
  },
  usuarios: {
    icon: UserCog,
    label: 'Usuários',
    color: 'text-red-600',
    bgColor: 'bg-red-50 dark:bg-red-950/20',
  },
  cargos: {
    icon: Shield,
    label: 'Cargos',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 dark:bg-amber-950/20',
  },
  equipes: {
    icon: UsersRound,
    label: 'Equipes',
    color: 'text-teal-600',
    bgColor: 'bg-teal-50 dark:bg-teal-950/20',
  },
  produtos: {
    icon: Package,
    label: 'Produtos',
    color: 'text-lime-600',
    bgColor: 'bg-lime-50 dark:bg-lime-950/20',
  },
  configuracoes: {
    icon: Settings,
    label: 'Configurações',
    color: 'text-gray-600',
    bgColor: 'bg-gray-50 dark:bg-gray-950/20',
  },
  workspace: {
    icon: LayoutGrid,
    label: 'Workspace',
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50 dark:bg-cyan-950/20',
  },
  gestao: {
    icon: Briefcase,
    label: 'Gestão',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 dark:bg-amber-950/20',
  },
  negocios: {
    icon: Building2,
    label: 'Negócios',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/20',
  },
};

export function VisualizarCargoDialog({
  cargo,
  open,
  onOpenChange,
}: VisualizarCargoDialogProps) {
  const { data: cargoDetalhado, isLoading } = useCargo(open ? cargo.id : null);

  // Agrupar permissões por grupo
  const permissoesPorGrupo = cargoDetalhado?.permissoes?.reduce(
    (acc, permissao) => {
      const grupo = permissao.grupo || 'Outros';
      if (!acc[grupo]) {
        acc[grupo] = [];
      }
      acc[grupo].push(permissao);
      return acc;
    },
    {} as Record<string, typeof cargoDetalhado.permissoes>,
  ) || {};

  const gruposOrdenados = Object.keys(permissoesPorGrupo).sort();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>{cargo.nomeCargo}</DialogTitle>
              <DialogDescription>
                Visualização completa do cargo e suas permissões
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="pr-4">
            <div className="space-y-6">
              {/* Informações Básicas */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Informações Básicas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Nome do Cargo
                      </p>
                      <p className="text-sm font-semibold mt-1">
                        {cargo.nomeCargo}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Tipo
                      </p>
                      <div className="mt-1 flex gap-2">
                        {cargo.isAdmin && (
                          <Badge variant="default" className="bg-red-600">
                            <Shield className="mr-1 h-3 w-3" />
                            Admin
                          </Badge>
                        )}
                        {cargo.isGestor && (
                          <Badge variant="default" className="bg-blue-600">
                            <Users className="mr-1 h-3 w-3" />
                            Gestor
                          </Badge>
                        )}
                        {cargo.isVendedor && (
                          <Badge className="bg-green-600">
                            <Briefcase className="mr-1 h-3 w-3" />
                            Vendedor
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Descrição
                    </p>
                    <p className="text-sm mt-1">
                      {cargo.descricao || 'Sem descrição disponível'}
                    </p>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Criado em
                      </p>
                      <p className="text-sm mt-1">
                        {new Date(cargo.createdAt).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    {cargo.updatedAt !== cargo.createdAt && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Atualizado em
                        </p>
                        <p className="text-sm mt-1">
                          {new Date(cargo.updatedAt).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Permissões */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Permissões Atribuídas</CardTitle>
                  <CardDescription>
                    {cargoDetalhado?.permissoes?.length || 0} permissão(ões) ativa(s)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {cargo.isAdmin ? (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 p-4">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                            Acesso Total ao Sistema
                          </p>
                          <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                            Este cargo possui todas as permissões do sistema
                            automaticamente. Administradores têm acesso irrestrito a
                            todos os módulos e funcionalidades.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : gruposOrdenados.length === 0 ? (
                    <div className="text-center py-8">
                      <XCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-20" />
                      <p className="text-sm text-muted-foreground">
                        Nenhuma permissão atribuída a este cargo
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {gruposOrdenados.map((grupo) => {
                        const permissoes = permissoesPorGrupo[grupo];
                        const grupoConfig = GRUPO_CONFIG[grupo] || {
                          icon: Shield,
                          label: grupo,
                          color: 'text-gray-600',
                          bgColor: 'bg-gray-50 dark:bg-gray-950/20',
                        };
                        const GrupoIcon = grupoConfig.icon;

                        return (
                          <Card key={grupo} className="border-2">
                            <CardHeader className="pb-3">
                              <div className="flex items-center gap-3">
                                <div
                                  className={cn(
                                    'p-2 rounded-lg',
                                    grupoConfig.bgColor,
                                  )}
                                >
                                  <GrupoIcon
                                    className={cn('h-4 w-4', grupoConfig.color)}
                                  />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <CardTitle className="text-sm">
                                      {grupoConfig.label}
                                    </CardTitle>
                                    <Badge variant="secondary" className="text-xs">
                                      {permissoes.length}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-2">
                                {permissoes.map((permissao) => (
                                  <div
                                    key={permissao.id}
                                    className="flex items-start gap-2 p-2 rounded-md bg-muted/50"
                                  >
                                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                                    <div className="flex-1">
                                      <p className="text-sm font-medium">
                                        {permissao.nomePermissao}
                                      </p>
                                      {permissao.descricao && (
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                          {permissao.descricao}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
