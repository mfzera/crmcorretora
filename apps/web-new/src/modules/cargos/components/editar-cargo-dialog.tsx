
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/core/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/core/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/core/ui/select';
import { Input } from '@/core/ui/input';
import { Textarea } from '@/core/ui/textarea';
import { Button } from '@/core/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/core/ui/tabs';
import { Badge } from '@/core/ui/badge';
import { ScrollArea } from '@/core/ui/scroll-area';
import { Separator } from '@/core/ui/separator';
import { Loader2, Save, X, Info, Shield, Eye, History, Plus, Minus, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { handleApiError } from '@/core/utils/handle-api-error';
import {
  type Cargo,
  type PermissaoGlobal,
  useCargo,
  usePermissoesGlobais,
  useUpdateCargo,
  useAssignPermissions,
  useCargoAuditoria,
  agruparPermissoesPorGrupo,
  getCargoColor,
} from '@/modules/cargos/http';
import { PermissoesSelector } from './permissoes-selector';

const cargoFormSchema = z.object({
  nomeCargo: z
    .string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(50, 'Nome deve ter no máximo 50 caracteres'),
  descricao: z
    .string()
    .max(255, 'Descrição deve ter no máximo 255 caracteres')
    .optional(),
  cor: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i, 'Cor inválida (formato: #RRGGBB)')
    .optional(),
});

type CargoFormData = z.infer<typeof cargoFormSchema>;

interface EditarCargoDialogProps {
  cargoId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditarCargoDialog({
  cargoId,
  open,
  onOpenChange,
}: EditarCargoDialogProps) {
  const [selectedPermissoes, setSelectedPermissoes] = useState<string[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  const { data: cargo, isLoading: loadingCargo } = useCargo(cargoId || '');
  const { data: todasPermissoes = [], isLoading: loadingPermissoes } =
    usePermissoesGlobais();
  const { data: auditoria = [] } = useCargoAuditoria(open ? cargoId : null);
  const updateCargo = useUpdateCargo();
  const atribuirPermissoes = useAssignPermissions();

  const form = useForm<CargoFormData>({
    resolver: zodResolver(cargoFormSchema),
    defaultValues: {
      nomeCargo: '',
      descricao: '',
      cor: '',
    },
  });

  // Atualizar form quando cargo carregar
  useEffect(() => {
    if (cargo) {
      form.reset({
        nomeCargo: cargo.nomeCargo,
        descricao: cargo.descricao || '',
        cor: cargo.cor || getCargoColor(cargo as any),
      });

      // Carregar permissões atuais do cargo
      const permissoesAtuais =
        cargo.permissoes?.map((p) => (p as any).permissaoGlobalId || p.id) ||
        [];
      setSelectedPermissoes(permissoesAtuais);
    }
  }, [cargo, form]);

  // Detectar mudanças
  useEffect(() => {
    const subscription = form.watch(() => {
      setHasChanges(true);
    });
    return () => subscription.unsubscribe();
  }, [form]);

  useEffect(() => {
    if (cargo) {
      const permissoesAtuais =
        cargo.permissoes?.map((p) => (p as any).permissaoGlobalId || p.id) ||
        [];
      const permissoesChanged =
        JSON.stringify(permissoesAtuais.sort()) !==
        JSON.stringify(selectedPermissoes.sort());
      if (permissoesChanged) {
        setHasChanges(true);
      }
    }
  }, [selectedPermissoes, cargo]);

  const handleSave = async (data: CargoFormData) => {
    if (!cargoId || !cargo) return;

    try {
      // 1. Atualizar dados básicos do cargo
      await updateCargo.mutateAsync({
        id: cargoId,
        nomeCargo: data.nomeCargo,
        descricao: data.descricao,
        cor: data.cor,
      });

      // 2. Atualizar permissões
      await atribuirPermissoes.mutateAsync({
        cargoId,
        permissaoIds: selectedPermissoes,
      });

      toast.success('Cargo atualizado com sucesso!');
      setHasChanges(false);
      onOpenChange(false);
    } catch (error) {
      toast.error(handleApiError(error));
    }
  };

  const handleClose = () => {
    if (hasChanges) {
      const confirmClose = window.confirm(
        'Você tem alterações não salvas. Deseja realmente fechar?',
      );
      if (!confirmClose) return;
    }
    onOpenChange(false);
    form.reset();
    setSelectedPermissoes([]);
    setHasChanges(false);
  };

  const isLoading = loadingCargo || loadingPermissoes;
  const isSaving = updateCargo.isPending || atribuirPermissoes.isPending;
  const isDisabled = isSaving || cargo?.isAdmin || cargo?.padrao;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Editar Cargo e Permissões
          </DialogTitle>
          <DialogDescription>
            Personalize o cargo e defina suas permissões de acesso
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSave)}
              className="flex flex-col"
            >
              <Tabs defaultValue="dados" className="flex-1">
                <TabsList className="px-6">
                  <TabsTrigger value="dados">Dados Básicos</TabsTrigger>
                  <TabsTrigger value="permissoes">
                    Permissões
                    <Badge variant="secondary" className="ml-2">
                      {selectedPermissoes.length}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="preview">
                    <Eye className="h-4 w-4 mr-1" />
                    Preview
                  </TabsTrigger>
                  <TabsTrigger value="historico">
                    <History className="h-4 w-4 mr-1" />
                    Histórico
                    {auditoria.length > 0 && (
                      <Badge variant="secondary" className="ml-2">{auditoria.length}</Badge>
                    )}
                  </TabsTrigger>
                </TabsList>

                <ScrollArea className="h-[500px]">
                  <TabsContent value="dados" className="px-6 py-4 space-y-4">
                    {(cargo?.isAdmin || cargo?.padrao) && (
                      <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800">
                        <Info className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                        <div className="flex-1 text-sm">
                          <p className="font-medium text-yellow-900 dark:text-yellow-100">
                            Cargo do Sistema
                          </p>
                          <p className="text-yellow-700 dark:text-yellow-300">
                            Este cargo é gerenciado pelo sistema e não pode ser
                            editado diretamente. Você pode duplicá-lo para criar
                            uma versão personalizada.
                          </p>
                        </div>
                      </div>
                    )}

                    <FormField
                      control={form.control}
                      name="nomeCargo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome do Cargo</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Ex: Gerente de Vendas"
                              disabled={isDisabled}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="descricao"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descrição</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="Descreva as responsabilidades e funções deste cargo"
                              rows={4}
                              disabled={isDisabled}
                            />
                          </FormControl>
                          <FormDescription>
                            Máximo de 255 caracteres
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="cor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cor do Cargo</FormLabel>
                          <FormControl>
                            <div className="flex gap-2">
                              <Input
                                {...field}
                                type="color"
                                className="w-20 h-10"
                                disabled={isDisabled}
                              />
                              <Input
                                {...field}
                                placeholder="#3B82F6"
                                className="flex-1"
                                disabled={isDisabled}
                              />
                            </div>
                          </FormControl>
                          <FormDescription>
                            Escolha uma cor para identificar visualmente o cargo
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>

                  <TabsContent value="permissoes" className="px-6 py-4">
                    {cargo?.isAdmin ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="text-center space-y-2">
                          <Shield className="h-12 w-12 mx-auto text-muted-foreground" />
                          <p className="text-muted-foreground">
                            Administradores têm acesso total ao sistema
                          </p>
                        </div>
                      </div>
                    ) : (
                      <PermissoesSelector
                        permissoes={todasPermissoes}
                        selectedPermissoes={selectedPermissoes}
                        onChange={setSelectedPermissoes}
                        disabled={isDisabled}
                      />
                    )}
                  </TabsContent>

                  <TabsContent value="preview" className="px-6 py-4">
                    <PermissoesPreview
                      permissoes={todasPermissoes}
                      selectedPermissoes={selectedPermissoes}
                    />
                  </TabsContent>

                  <TabsContent value="historico" className="px-6 py-4">
                    <AuditoriaHistorico entries={auditoria} />
                  </TabsContent>
                </ScrollArea>
              </Tabs>

              <Separator />

              <DialogFooter className="px-6 py-4">
                <div className="flex items-center justify-between w-full">
                  <div className="text-sm text-muted-foreground">
                    {hasChanges && (
                      <span className="text-yellow-600 dark:text-yellow-400">
                        Alterações não salvas
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleClose}
                      disabled={isSaving}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={isDisabled || !hasChanges}>
                      {isSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-1" />
                          Salvar Alterações
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface PermissoesPreviewProps {
  permissoes: PermissaoGlobal[];
  selectedPermissoes: string[];
}

function PermissoesPreview({
  permissoes,
  selectedPermissoes,
}: PermissoesPreviewProps) {
  const grupos = agruparPermissoesPorGrupo(
    permissoes.filter((p) => selectedPermissoes.includes(p.id)),
  );

  if (selectedPermissoes.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-2">
          <Shield className="h-12 w-12 mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">Nenhuma permissão selecionada</p>
          <p className="text-sm text-muted-foreground">
            Vá para a aba Permissões para selecionar
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Preview das Permissões</h3>
          <p className="text-sm text-muted-foreground">
            Este cargo terá acesso a {selectedPermissoes.length} permissões
          </p>
        </div>
        <Badge variant="secondary" className="text-base px-3 py-1">
          {selectedPermissoes.length} permissões
        </Badge>
      </div>

      <div className="space-y-4">
        {grupos.map((grupo) => (
          <div key={grupo.nome} className="p-4 rounded-lg border bg-card">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium capitalize">{grupo.nome}</h4>
              <Badge variant="outline">{grupo.permissoes.length}</Badge>
            </div>
            <div className="grid gap-2">
              {grupo.permissoes.map((permissao) => (
                <div
                  key={permissao.id}
                  className="flex items-start gap-2 text-sm p-2 rounded bg-muted/50"
                >
                  <Shield className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-xs text-muted-foreground">
                      {permissao.nomePermissao}
                    </p>
                    <p className="text-sm">{permissao.descricao}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const ACAO_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  cargo_criado: { label: 'Cargo criado', icon: <Plus className="h-3.5 w-3.5" />, color: 'text-green-500' },
  cargo_editado: { label: 'Cargo editado', icon: <RefreshCw className="h-3.5 w-3.5" />, color: 'text-blue-500' },
  cargo_excluido: { label: 'Cargo excluído', icon: <Minus className="h-3.5 w-3.5" />, color: 'text-red-500' },
  permissao_adicionada: { label: 'Permissão adicionada', icon: <Plus className="h-3.5 w-3.5" />, color: 'text-green-500' },
  permissao_removida: { label: 'Permissão removida', icon: <Minus className="h-3.5 w-3.5" />, color: 'text-red-500' },
  permissoes_alteradas: { label: 'Permissões alteradas', icon: <RefreshCw className="h-3.5 w-3.5" />, color: 'text-blue-500' },
  cargo_atribuido: { label: 'Cargo atribuído', icon: <RefreshCw className="h-3.5 w-3.5" />, color: 'text-purple-500' },
};

interface AuditoriaHistoricoProps {
  entries: Array<{
    id: string;
    acao: string;
    metadados: Record<string, any> | null;
    ipAddress: string | null;
    createdAt: string;
    usuario: { id: string; nome: string } | null;
    permissao: { id: string; nomePermissao: string; descricao: string | null } | null;
  }>;
}

function AuditoriaHistorico({ entries }: AuditoriaHistoricoProps) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
        <History className="h-10 w-10 text-muted-foreground" />
        <p className="text-muted-foreground">Nenhuma atividade registrada</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground mb-3">{entries.length} eventos registrados</p>
      {entries.map((entry) => {
        const meta = ACAO_META[entry.acao] ?? { label: entry.acao, icon: <RefreshCw className="h-3.5 w-3.5" />, color: 'text-muted-foreground' };
        const added = entry.metadados?.permissoesAdicionadas as string[] | undefined;
        const removed = entry.metadados?.permissoesRemovidas as string[] | undefined;
        return (
          <div key={entry.id} className="flex gap-3 p-3 rounded-lg border bg-card text-sm">
            <div className={`mt-0.5 shrink-0 ${meta.color}`}>{meta.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{meta.label}</span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {new Date(entry.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              </div>
              {entry.usuario && (
                <p className="text-xs text-muted-foreground mt-0.5">por {entry.usuario.nome}</p>
              )}
              {entry.permissao && (
                <code className="text-xs font-mono text-muted-foreground mt-1 block">{entry.permissao.nomePermissao}</code>
              )}
              {(added?.length || removed?.length) ? (
                <div className="mt-1 flex flex-wrap gap-1">
                  {added?.map((p) => <span key={p} className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 font-mono">+{p}</span>)}
                  {removed?.map((p) => <span key={p} className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 font-mono">-{p}</span>)}
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
