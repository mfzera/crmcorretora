
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
  ChevronRight,
  Info,
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
} from '@/core/ui/dialog';
import { Button } from '@/core/ui/button';
import { Input } from '@/core/ui/input';
import { Label } from '@/core/ui/label';
import { Textarea } from '@/core/ui/textarea';
import { Switch } from '@/core/ui/switch';
import { Checkbox } from '@/core/ui/checkbox';
import { Badge } from '@/core/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/core/ui/card';
import { Separator } from '@/core/ui/separator';
import { useCreateCargo, useAssignPermissions } from '@/modules/cargos/http';
import { usePermissoesDisponiveis } from '@/modules/permissoes/http';
import { cn } from '@/core/utils';

const cargoSchema = z.object({
  nomeCargo: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').max(100),
  descricao: z.string().max(500).optional().or(z.literal('')),
  cor: z.string().optional(),
});

const CORES_DISPONIVEIS = [
  { valor: 'blue', nome: 'Azul', cor: '#3b82f6' },
  { valor: 'green', nome: 'Verde', cor: '#22c55e' },
  { valor: 'purple', nome: 'Roxo', cor: '#a855f7' },
  { valor: 'orange', nome: 'Laranja', cor: '#f97316' },
  { valor: 'pink', nome: 'Rosa', cor: '#ec4899' },
  { valor: 'red', nome: 'Vermelho', cor: '#ef4444' },
  { valor: 'yellow', nome: 'Amarelo', cor: '#eab308' },
  { valor: 'indigo', nome: 'Índigo', cor: '#6366f1' },
  { valor: 'teal', nome: 'Turquesa', cor: '#14b8a6' },
  { valor: 'cyan', nome: 'Ciano', cor: '#06b6d4' },
  { valor: 'gray', nome: 'Cinza', cor: '#6b7280' },
  { valor: 'slate', nome: 'Ardósia', cor: '#64748b' },
];

type FormData = z.infer<typeof cargoSchema>;

interface NovoCargoDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}

// Configuração de ícones e informações para cada grupo
const GRUPO_CONFIG: Record<
  string,
  {
    icon: LucideIcon;
    label: string;
    description: string;
    color: string;
    bgColor: string;
  }
> = {
  dashboard: {
    icon: LayoutDashboard,
    label: 'Dashboard',
    description: 'Acesso ao painel principal e visualização de métricas',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-950/20',
  },
  vendas: {
    icon: ShoppingCart,
    label: 'Vendas',
    description: 'Gestão de cotações, propostas e documentos de venda',
    color: 'text-green-600',
    bgColor: 'bg-green-50 dark:bg-green-950/20',
  },
  cadastro: {
    icon: FileText,
    label: 'Cadastro',
    description: 'Validação e aprovação de documentos e vendas',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 dark:bg-orange-950/20',
  },
  clientes: {
    icon: Users,
    label: 'Clientes',
    description: 'Gerenciamento da carteira de clientes',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 dark:bg-purple-950/20',
  },
  renovacoes: {
    icon: RefreshCw,
    label: 'Renovações',
    description: 'Controle do processo de renovação de apólices',
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50 dark:bg-cyan-950/20',
  },
  metricas: {
    icon: BarChart3,
    label: 'Métricas',
    description: 'Análise de desempenho e indicadores',
    color: 'text-pink-600',
    bgColor: 'bg-pink-50 dark:bg-pink-950/20',
  },
  relatorios: {
    icon: FileBarChart,
    label: 'Relatórios',
    description: 'Geração e exportação de relatórios',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50 dark:bg-indigo-950/20',
  },
  usuarios: {
    icon: UserCog,
    label: 'Usuários',
    description: 'Gerenciamento de usuários do sistema',
    color: 'text-red-600',
    bgColor: 'bg-red-50 dark:bg-red-950/20',
  },
  cargos: {
    icon: Shield,
    label: 'Cargos',
    description: 'Criação e gestão de cargos e permissões',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 dark:bg-amber-950/20',
  },
  equipes: {
    icon: UsersRound,
    label: 'Equipes',
    description: 'Organização e gestão de equipes',
    color: 'text-teal-600',
    bgColor: 'bg-teal-50 dark:bg-teal-950/20',
  },
  produtos: {
    icon: Package,
    label: 'Produtos',
    description: 'Gerenciamento de produtos e seguradoras parceiras',
    color: 'text-lime-600',
    bgColor: 'bg-lime-50 dark:bg-lime-950/20',
  },
  configuracoes: {
    icon: Settings,
    label: 'Configurações',
    description: 'Configurações gerais do sistema',
    color: 'text-gray-600',
    bgColor: 'bg-gray-50 dark:bg-gray-950/20',
  },
  workspace: {
    icon: LayoutGrid,
    label: 'Workspace',
    description: 'Ferramentas de trabalho e colaboração',
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50 dark:bg-cyan-950/20',
  },
  gestao: {
    icon: Briefcase,
    label: 'Gestão',
    description: 'Ferramentas de gestão comercial e de pessoas',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 dark:bg-amber-950/20',
  },
  negocios: {
    icon: Building2,
    label: 'Negócios',
    description: 'Negócios e operações da corretora',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/20',
  },
};

export function NovoCargoDialog({
  open,
  onOpenChange,
  onSuccess,
}: NovoCargoDialogProps) {
  const [etapa, setEtapa] = useState<'dados' | 'permissoes'>('dados');
  const [permissoesSelecionadas, setPermissoesSelecionadas] = useState<
    Set<string>
  >(new Set());
  const [grupoExpandido, setGrupoExpandido] = useState<string | null>(null);

  const { data: permissoesDisponiveis = {}, isLoading: isLoadingPermissoes } =
    usePermissoesDisponiveis();
  const criarCargo = useCreateCargo();
  const atribuirPermissoes = useAssignPermissions();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
    getValues,
  } = useForm<FormData>({
    resolver: zodResolver(cargoSchema),
    defaultValues: {
      nomeCargo: '',
      descricao: '',
      cor: 'blue',
    },
  });

  const corSelecionada = watch('cor');

  // Reset ao fechar
  useEffect(() => {
    if (!open) {
      setEtapa('dados');
      setPermissoesSelecionadas(new Set());
      setGrupoExpandido(null);
      reset({
        nomeCargo: '',
        descricao: '',
        cor: 'blue',
      });
    }
  }, [open, reset]);

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
        idsDoGrupo.forEach((id) => newSet.delete(id));
      } else {
        idsDoGrupo.forEach((id) => newSet.add(id));
      }
      return newSet;
    });
  };

  const handleProximaEtapa = () => {
    // Validar dados básicos antes de ir para permissões
    const dados = getValues();
    if (!dados.nomeCargo || dados.nomeCargo.length < 2) {
      toast.error('Por favor, preencha o nome do cargo');
      return;
    }
    setEtapa('permissoes');
  };

  const handleVoltarEtapa = () => {
    setEtapa('dados');
  };

  const onSubmit = async (data: FormData) => {
    try {
      // Criar o cargo
      const novoCargo = await criarCargo.mutateAsync({
        nomeCargo: data.nomeCargo,
        descricao: data.descricao || undefined,
        cor: data.cor || 'blue',
      });

      // Atribuir permissões se houver alguma selecionada
      if (permissoesSelecionadas.size > 0) {
        await atribuirPermissoes.mutateAsync({
          cargoId: novoCargo.id,
          permissaoIds: Array.from(permissoesSelecionadas),
        });
      }

      toast.success('Cargo criado com sucesso!');
      onOpenChange?.(false);
      onSuccess?.();
    } catch (error) {
      toast.error(handleApiError(error));
    }
  };

  const gruposOrdenados = Object.keys(permissoesDisponiveis).sort();

  const renderEtapaDados = () => (
    <form className="space-y-4">
      {/* Nome do Cargo */}
      <div className="space-y-2">
        <Label htmlFor="nomeCargo">
          Nome do Cargo <span className="text-red-500">*</span>
        </Label>
        <Input
          id="nomeCargo"
          placeholder="Ex: Atendente, Supervisor, Gerente..."
          {...register('nomeCargo')}
          autoFocus
        />
        {errors.nomeCargo && (
          <p className="text-sm text-red-500">{errors.nomeCargo.message}</p>
        )}
      </div>

      {/* Descrição */}
      <div className="space-y-2">
        <Label htmlFor="descricao">Descrição</Label>
        <Textarea
          id="descricao"
          placeholder="Descreva as responsabilidades deste cargo..."
          rows={3}
          {...register('descricao')}
        />
        {errors.descricao && (
          <p className="text-sm text-red-500">{errors.descricao.message}</p>
        )}
      </div>

      {/* Seletor de Cor */}
      <div className="space-y-2">
        <Label>Cor do Cargo</Label>
        <div className="grid grid-cols-6 gap-2">
          {CORES_DISPONIVEIS.map((cor) => {
            const isSelected = corSelecionada === cor.valor;

            return (
              <button
                key={cor.valor}
                type="button"
                onClick={() => setValue('cor', cor.valor)}
                style={{
                  backgroundColor: cor.cor,
                  borderWidth: '3px',
                  borderColor: isSelected ? '#000000' : 'transparent',
                  transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                  opacity: isSelected ? 1 : 0.7,
                }}
                className="h-10 w-full rounded-md transition-all hover:scale-105 hover:opacity-100"
                title={cor.nome}
              />
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          Selecione uma cor para identificar visualmente este cargo
        </p>
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 p-3">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-blue-900 dark:text-blue-100">
            Na próxima etapa você poderá definir exatamente quais módulos e
            funcionalidades este cargo terá acesso no sistema.
          </p>
        </div>
      </div>
    </form>
  );

  const renderEtapaPermissoes = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Selecione as Permissões</p>
          <p className="text-xs text-muted-foreground mt-1">
            {permissoesSelecionadas.size} permissão(ões) selecionada(s)
          </p>
        </div>
        {permissoesSelecionadas.size > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setPermissoesSelecionadas(new Set())}
          >
            Limpar Todas
          </Button>
        )}
      </div>

      {isLoadingPermissoes ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : gruposOrdenados.length === 0 ? (
        <div className="text-center py-12">
          <Shield className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-20" />
          <p className="text-sm font-medium mb-2">
            Nenhuma permissão disponível
          </p>
          <p className="text-xs text-muted-foreground">
            Entre em contato com o administrador do sistema para configurar as
            permissões
          </p>
        </div>
      ) : (
        <div className="pr-4">
          <div className="space-y-3">
            {gruposOrdenados.map((grupo) => {
              const permissoesDoGrupo = permissoesDisponiveis[grupo] || [];
              const idsDoGrupo = permissoesDoGrupo.map((p) => p.id);
              const todasSelecionadas = idsDoGrupo.every((id) =>
                permissoesSelecionadas.has(id),
              );
              const algumasSelecionadas =
                !todasSelecionadas &&
                idsDoGrupo.some((id) => permissoesSelecionadas.has(id));
              const grupoConfig = GRUPO_CONFIG[grupo] || {
                icon: Shield,
                label: grupo,
                description: '',
                color: 'text-gray-600',
                bgColor: 'bg-gray-50 dark:bg-gray-950/20',
              };
              const GrupoIcon = grupoConfig.icon;
              const isExpanded = grupoExpandido === grupo;

              return (
                <Card
                  key={grupo}
                  className={cn(
                    'transition-all duration-200',
                    (todasSelecionadas || algumasSelecionadas) &&
                      'border-primary',
                  )}
                >
                  <CardHeader
                    className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setGrupoExpandido(isExpanded ? null : grupo)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div
                          className={cn('p-2 rounded-lg', grupoConfig.bgColor)}
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
                            <Badge
                              variant={
                                todasSelecionadas
                                  ? 'default'
                                  : algumasSelecionadas
                                    ? 'secondary'
                                    : 'outline'
                              }
                              className="text-xs"
                            >
                              {
                                idsDoGrupo.filter((id) =>
                                  permissoesSelecionadas.has(id),
                                ).length
                              }
                              /{permissoesDoGrupo.length}
                            </Badge>
                          </div>
                          <CardDescription className="text-xs mt-1">
                            {grupoConfig.description}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={todasSelecionadas}
                          onCheckedChange={() => toggleGrupo(grupo)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <ChevronRight
                          className={cn(
                            'h-4 w-4 transition-transform',
                            isExpanded && 'rotate-90',
                          )}
                        />
                      </div>
                    </div>
                  </CardHeader>

                  {isExpanded && (
                    <CardContent className="p-4 pt-0 space-y-2">
                      <Separator className="mb-3" />
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
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>
                {etapa === 'dados' ? 'Criar Novo Cargo' : 'Definir Permissões'}
              </DialogTitle>
              <DialogDescription>
                {etapa === 'dados'
                  ? 'Configure as informações básicas do cargo'
                  : 'Escolha os módulos e funcionalidades que este cargo terá acesso'}
              </DialogDescription>
            </div>
          </div>

          {/* Indicador de Etapas */}
          <div className="flex items-center gap-2 mt-4">
            <div className="flex items-center gap-2 flex-1">
              <div
                className={cn(
                  'flex-1 h-1.5 rounded-full transition-colors',
                  etapa === 'dados' ? 'bg-primary' : 'bg-primary/20',
                )}
              />
              <div
                className={cn(
                  'flex-1 h-1.5 rounded-full transition-colors',
                  etapa === 'permissoes' ? 'bg-primary' : 'bg-muted',
                )}
              />
            </div>
            <span className="text-xs text-muted-foreground">
              {etapa === 'dados' ? 'Etapa 1 de 2' : 'Etapa 2 de 2'}
            </span>
          </div>
        </DialogHeader>

        <div>
          {etapa === 'dados' ? renderEtapaDados() : renderEtapaPermissoes()}
        </div>

        <DialogFooter className="mt-4">
          {etapa === 'dados' ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange?.(false)}
              >
                Cancelar
              </Button>
              <Button type="button" onClick={handleProximaEtapa}>
                Próximo: Permissões
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handleVoltarEtapa}
                disabled={isSubmitting}
              >
                Voltar
              </Button>
              <Button onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isSubmitting ? 'Criando...' : 'Criar Cargo'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
