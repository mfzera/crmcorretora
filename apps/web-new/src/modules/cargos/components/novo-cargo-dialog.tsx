
import { useState } from 'react';
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
import { Loader2, Save, X, Shield, Copy, Sparkles, Eye, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { handleApiError } from '@/core/utils/handle-api-error';
import {
  type Cargo,
  type PermissaoGlobal,
  useCargos,
  usePermissoesGlobais,
  useCreateCargo,
  useAssignPermissions,
  agruparPermissoesPorGrupo,
} from '@/modules/cargos/http';
import { PermissoesSelector } from './permissoes-selector';

const novoCargoFormSchema = z.object({
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
  basearEm: z.string().optional(),
});

type NovoCargoFormData = z.infer<typeof novoCargoFormSchema>;

interface NovoCargoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cargoParaDuplicar?: Cargo | null;
}

// Templates de permissões pré-definidos
const TEMPLATES = [
  {
    id: 'vendedor',
    nome: 'Vendedor',
    descricao: 'Permissões básicas para vendedores',
    cor: '#10B981',
    grupos: ['dashboard', 'vendas', 'clientes', 'documentos'],
  },
  {
    id: 'gestor',
    nome: 'Gestor de Equipe',
    descricao: 'Permissões para gestão de equipe',
    cor: '#3B82F6',
    grupos: [
      'dashboard',
      'vendas',
      'clientes',
      'produtos',
      'relatorios',
      'documentos',
    ],
  },
  {
    id: 'cadastro',
    nome: 'Cadastro',
    descricao: 'Permissões para cadastros e configurações',
    cor: '#8B5CF6',
    grupos: ['clientes', 'produtos', 'seguradoras', 'fornecedores'],
  },
  {
    id: 'personalizado',
    nome: 'Personalizado',
    descricao: 'Começar do zero',
    cor: '#6B7280',
    grupos: [],
  },
];

export function NovoCargoDialog({
  open,
  onOpenChange,
  cargoParaDuplicar,
}: NovoCargoDialogProps) {
  const [selectedPermissoes, setSelectedPermissoes] = useState<string[]>([]);
  const [templateSelecionado, setTemplateSelecionado] = useState<string | null>(null);
  const [pendingTemplate, setPendingTemplate] = useState<{ id: string; permissaoIds: string[] } | null>(null);

  const { data: cargosExistentes = [] } = useCargos();
  const { data: todasPermissoes = [], isLoading: loadingPermissoes } =
    usePermissoesGlobais();
  const createCargo = useCreateCargo();
  const atribuirPermissoes = useAssignPermissions();

  const form = useForm<NovoCargoFormData>({
    resolver: zodResolver(novoCargoFormSchema),
    defaultValues: {
      nomeCargo: cargoParaDuplicar?.nomeCargo
        ? `${cargoParaDuplicar.nomeCargo} (Cópia)`
        : '',
      descricao: cargoParaDuplicar?.descricao || '',
      cor: cargoParaDuplicar?.cor || '#3B82F6',
      basearEm: '',
    },
  });

  // Se estiver duplicando, carregar permissões
  useState(() => {
    if (cargoParaDuplicar?.permissoes) {
      const permissoes = cargoParaDuplicar.permissoes.map(
        (p) => p.permissaoGlobalId,
      );
      setSelectedPermissoes(permissoes);
    }
  });

  const handleTemplateSelect = (templateId: string) => {
    const template = TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;

    const templatePermIds = template.grupos.length > 0
      ? todasPermissoes.filter((p) => p.grupo && template.grupos.includes(p.grupo)).map((p) => p.id)
      : [];

    // Show pending preview instead of immediately applying
    setPendingTemplate({ id: templateId, permissaoIds: templatePermIds });
  };

  const confirmTemplate = () => {
    if (!pendingTemplate) return;
    const template = TEMPLATES.find((t) => t.id === pendingTemplate.id);
    if (!template) return;
    setTemplateSelecionado(pendingTemplate.id);
    form.setValue('cor', template.cor);
    setSelectedPermissoes(pendingTemplate.permissaoIds);
    setPendingTemplate(null);
  };

  const handleBasearEm = (cargoId: string) => {
    const cargo = cargosExistentes.find((c) => c.id === cargoId);
    if (!cargo) return;

    form.setValue('nomeCargo', `${cargo.nomeCargo} (Cópia)`);
    form.setValue('descricao', cargo.descricao || '');
    form.setValue('cor', cargo.cor || '#3B82F6');

    const permissoes = cargo.permissoes?.map((p) => p.permissaoGlobalId) || [];
    setSelectedPermissoes(permissoes);
  };

  const handleSave = async (data: NovoCargoFormData) => {
    try {
      // 1. Criar cargo
      const novoCargo = await createCargo.mutateAsync({
        nomeCargo: data.nomeCargo,
        descricao: data.descricao,
        cor: data.cor,
        isAdmin: false,
        isGestor: false,
      });

      // 2. Atribuir permissões se houver
      if (selectedPermissoes.length > 0) {
        await atribuirPermissoes.mutateAsync({
          cargoId: novoCargo.id,
          permissaoIds: selectedPermissoes,
        });
      }

      toast.success('Cargo criado com sucesso!');
      handleClose();
    } catch (error) {
      toast.error(handleApiError(error));
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    form.reset();
    setSelectedPermissoes([]);
    setTemplateSelecionado(null);
    setPendingTemplate(null);
  };

  const isSaving = createCargo.isPending || atribuirPermissoes.isPending;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            {cargoParaDuplicar ? 'Duplicar Cargo' : 'Criar Novo Cargo'}
          </DialogTitle>
          <DialogDescription>
            {cargoParaDuplicar
              ? `Criando uma cópia de "${cargoParaDuplicar.nomeCargo}"`
              : 'Configure um novo cargo e defina suas permissões'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSave)}
            className="flex flex-col"
          >
            <Tabs defaultValue="dados" className="flex-1">
              <TabsList className="px-6">
                <TabsTrigger value="dados">Dados Básicos</TabsTrigger>
                <TabsTrigger value="template">
                  <Sparkles className="h-4 w-4 mr-1" />
                  Templates
                </TabsTrigger>
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
              </TabsList>

              <ScrollArea className="h-[500px]">
                <TabsContent value="dados" className="px-6 py-4 space-y-4">
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
                            disabled={isSaving}
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
                            disabled={isSaving}
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
                              disabled={isSaving}
                            />
                            <Input
                              {...field}
                              placeholder="#3B82F6"
                              className="flex-1"
                              disabled={isSaving}
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

                  {!cargoParaDuplicar && cargosExistentes.length > 0 && (
                    <FormField
                      control={form.control}
                      name="basearEm"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Basear em cargo existente (opcional)
                          </FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={(value) => {
                              field.onChange(value);
                              handleBasearEm(value);
                            }}
                            disabled={isSaving}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione um cargo como base" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {cargosExistentes.map((cargo) => (
                                <SelectItem key={cargo.id} value={cargo.id}>
                                  <div className="flex items-center gap-2">
                                    <Copy className="h-4 w-4" />
                                    {cargo.nomeCargo}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Copiar permissões de um cargo existente
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                  )}
                </TabsContent>

                <TabsContent value="template" className="px-6 py-4">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold mb-2">Templates Rápidos</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Escolha um template para começar rapidamente
                      </p>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      {TEMPLATES.map((template) => (
                        <button
                          key={template.id}
                          type="button"
                          onClick={() => handleTemplateSelect(template.id)}
                          className={`p-4 rounded-lg border-2 text-left transition-all hover:shadow-md ${
                            templateSelecionado === template.id
                              ? 'border-primary bg-primary/5'
                              : pendingTemplate?.id === template.id
                              ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/30'
                              : 'border-border hover:border-primary/50'
                          }`}
                          disabled={isSaving}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className="p-2 rounded-lg"
                              style={{
                                backgroundColor: `${template.cor}20`,
                                color: template.cor,
                              }}
                            >
                              <Shield className="h-5 w-5" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium">{template.nome}</h4>
                              <p className="text-sm text-muted-foreground">
                                {template.descricao}
                              </p>
                              {template.grupos.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {template.grupos.slice(0, 3).map((grupo) => (
                                    <Badge
                                      key={grupo}
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      {grupo}
                                    </Badge>
                                  ))}
                                  {template.grupos.length > 3 && (
                                    <Badge
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      +{template.grupos.length - 3}
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  {/* Pending template preview — shown before confirming */}
                  {pendingTemplate && (() => {
                    const tpl = TEMPLATES.find((t) => t.id === pendingTemplate.id);
                    const permissoes = todasPermissoes.filter((p) => pendingTemplate.permissaoIds.includes(p.id));
                    const addedIds = pendingTemplate.permissaoIds.filter((id) => !selectedPermissoes.includes(id));
                    const removedIds = selectedPermissoes.filter((id) => !pendingTemplate.permissaoIds.includes(id));
                    return (
                      <div className="mt-4 rounded-lg border-2 border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30 p-4 space-y-3">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                          <div>
                            <p className="font-medium text-sm">Confirmar template &quot;{tpl?.nome}&quot;?</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Isso aplicará {permissoes.length} permissão{permissoes.length !== 1 ? 'ões' : ''} ao cargo.
                              {addedIds.length > 0 && ` +${addedIds.length} a adicionar.`}
                              {removedIds.length > 0 && ` -${removedIds.length} a remover.`}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={confirmTemplate}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                          >
                            <Check className="h-3.5 w-3.5" />
                            Aplicar Template
                          </button>
                          <button
                            type="button"
                            onClick={() => setPendingTemplate(null)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm text-muted-foreground hover:bg-muted transition-colors"
                          >
                            <X className="h-3.5 w-3.5" />
                            Cancelar
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                  </div>
                </TabsContent>

                <TabsContent value="permissoes" className="px-6 py-4">
                  {loadingPermissoes ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <PermissoesSelector
                      permissoes={todasPermissoes}
                      selectedPermissoes={selectedPermissoes}
                      onChange={setSelectedPermissoes}
                      disabled={isSaving}
                    />
                  )}
                </TabsContent>

                <TabsContent value="preview" className="px-6 py-4">
                  <PermissoesPreview
                    permissoes={todasPermissoes}
                    selectedPermissoes={selectedPermissoes}
                  />
                </TabsContent>
              </ScrollArea>
            </Tabs>

            <Separator />

            <DialogFooter className="px-6 py-4">
              <div className="flex items-center justify-between w-full">
                <div className="text-sm text-muted-foreground">
                  {selectedPermissoes.length > 0 && (
                    <span>
                      {selectedPermissoes.length} permissões selecionadas
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
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        Criando...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-1" />
                        Criar Cargo
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogFooter>
          </form>
        </Form>
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
            Use os Templates ou vá para a aba Permissões
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
