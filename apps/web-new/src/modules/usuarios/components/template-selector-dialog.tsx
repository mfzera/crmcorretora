
import { useState, useMemo } from 'react';
import {
  Sparkles,
  Loader2,
  ArrowRight,
  Key,
  Plus,
  Shield,
  Users,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/core/ui/dialog';
import { Button } from '@/core/ui/button';
import { Input } from '@/core/ui/input';
import { Label } from '@/core/ui/label';
import { Textarea } from '@/core/ui/textarea';
import { Badge } from '@/core/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/core/ui/card';
import { Separator } from '@/core/ui/separator';
import { toast } from 'sonner';
import { handleApiError } from '@/core/utils/handle-api-error';
import {
  getCargoTemplateOptions,
  getCargoTemplate,
  getPermissaoIdsByNames,
  type CargosPadraoKeys,
} from '@ecotech/shared/utils';
import { useCreateCargo, useAssignPermissions } from '@/modules/cargos/http';
import { usePermissoesGlobais } from '@/modules/permissoes/http';

interface TemplateSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  onCreateFromScratch?: () => void;
}

const CORES_DISPONIVEIS = [
  { nome: 'Azul', valor: '#3b82f6' },
  { nome: 'Verde', valor: '#22c55e' },
  { nome: 'Roxo', valor: '#a855f7' },
  { nome: 'Laranja', valor: '#f97316' },
  { nome: 'Rosa', valor: '#ec4899' },
  { nome: 'Vermelho', valor: '#ef4444' },
  { nome: 'Amarelo', valor: '#eab308' },
  { nome: 'Índigo', valor: '#6366f1' },
  { nome: 'Turquesa', valor: '#14b8a6' },
  { nome: 'Ciano', valor: '#06b6d4' },
];

// Ícones para cada template fixo
const TEMPLATE_ICONS: Record<CargosPadraoKeys, React.ComponentType<any>> = {
  GERENTE: Shield,
  VENDEDOR: Users,
  CADASTRO: FileText,
  SINISTROS: AlertTriangle,
};

export function TemplateSelectorDialog({
  open,
  onOpenChange,
  onSuccess,
  onCreateFromScratch,
}: TemplateSelectorDialogProps) {
  const [step, setStep] = useState<'select' | 'customize'>('select');
  const [selectedTemplateKey, setSelectedTemplateKey] =
    useState<CargosPadraoKeys | null>(null);
  const [nomeCargo, setNomeCargo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [corSelecionada, setCorSelecionada] = useState<string>('#3b82f6');

  // Buscar templates fixos do código
  const templatesFixos = useMemo(() => getCargoTemplateOptions(), []);

  // Buscar permissões globais para conversão
  const { data: permissoesGlobaisArray = [], isLoading: isLoadingPermissoes } =
    usePermissoesGlobais();

  const criarCargo = useCreateCargo();
  const atribuirPermissoes = useAssignPermissions();

  const isPending = criarCargo.isPending || atribuirPermissoes.isPending;

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset state quando fechar
      setStep('select');
      setSelectedTemplateKey(null);
      setNomeCargo('');
      setDescricao('');
      setCorSelecionada('#3b82f6');
    }
    onOpenChange(newOpen);
  };

  const handleSelectTemplate = (templateKey: CargosPadraoKeys) => {
    const template = getCargoTemplate(templateKey);

    setSelectedTemplateKey(templateKey);
    setNomeCargo(template.nomeCargo);
    setDescricao(template.descricao || '');
    setCorSelecionada(template.cor || '#3b82f6');
    setStep('customize');
  };

  const handleBack = () => {
    setStep('select');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedTemplateKey || !nomeCargo.trim()) return;

    try {
      const template = getCargoTemplate(selectedTemplateKey);

      // 1. Criar o cargo
      const novoCargo = await criarCargo.mutateAsync({
        nomeCargo: nomeCargo.trim(),
        descricao: descricao.trim() || undefined,
        cor: corSelecionada,
        isGestor: template.isGestor,
        isVendedor: template.isVendedor,
        isAdmin: template.isAdmin,
      });

      // 2. Converter nomes de permissões em IDs
      const permissaoIds = getPermissaoIdsByNames(
        template.permissoes,
        permissoesGlobaisArray,
      );

      // 3. Atribuir permissões se houver alguma
      if (permissaoIds.length > 0) {
        await atribuirPermissoes.mutateAsync({
          cargoId: novoCargo.id,
          permissaoIds,
        });
      }

      toast.success('Cargo criado com sucesso a partir do template!');
      handleOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error(handleApiError(error));
    }
  };

  const getCategoryBadge = (key: CargosPadraoKeys) => {
    const styles: Record<CargosPadraoKeys, string> = {
      GERENTE:
        'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      VENDEDOR:
        'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      CADASTRO:
        'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      SINISTROS:
        'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
    };
    return styles[key];
  };

  const selectedTemplate = selectedTemplateKey
    ? getCargoTemplate(selectedTemplateKey)
    : null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
        {step === 'select' ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Criar Novo Cargo
              </DialogTitle>
              <DialogDescription>
                Escolha um template pré-pronto ou crie do zero. Templates
                incluem permissões já configuradas.
              </DialogDescription>
            </DialogHeader>

            {/* Botão criar do zero */}
            <Card
              className="border-dashed border-2 cursor-pointer hover:bg-accent transition-colors"
              onClick={() => {
                handleOpenChange(false);
                onCreateFromScratch?.();
              }}
            >
              <CardContent className="flex items-center gap-4 p-6">
                <div className="rounded-full bg-primary/10 p-3">
                  <Plus className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">Criar do Zero</h3>
                  <p className="text-sm text-muted-foreground">
                    Configure todas as permissões manualmente
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>

            <Separator className="my-4" />

            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Templates Fixos
              </h3>

              {isLoadingPermissoes ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : templatesFixos.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhum template disponível
                </p>
              ) : (
                <div className="grid gap-3">
                  {templatesFixos.map((template) => {
                    const Icon = TEMPLATE_ICONS[template.value];
                    const fullTemplate = getCargoTemplate(template.value);

                    return (
                      <Card
                        key={template.value}
                        className="cursor-pointer hover:bg-accent transition-colors border-l-4"
                        style={{ borderLeftColor: template.cor || '#3b82f6' }}
                        onClick={() => handleSelectTemplate(template.value)}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-3 flex-1">
                              <div
                                className="p-2 rounded-lg"
                                style={{
                                  backgroundColor: `${template.cor}20`,
                                  color: template.cor,
                                }}
                              >
                                <Icon className="h-5 w-5" />
                              </div>
                              <div className="flex-1">
                                <CardTitle className="text-base flex items-center gap-2">
                                  {template.label}
                                  <Badge
                                    variant="secondary"
                                    className={getCategoryBadge(template.value)}
                                  >
                                    {template.value}
                                  </Badge>
                                </CardTitle>
                                <CardDescription className="mt-1">
                                  {template.description}
                                </CardDescription>
                              </div>
                            </div>
                            <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Key className="h-3 w-3" />
                              <span>
                                {fullTemplate.permissoes.length} permissões
                              </span>
                            </div>
                            {fullTemplate.isGestor && (
                              <Badge variant="outline" className="text-xs">
                                Gestor
                              </Badge>
                            )}
                            {fullTemplate.isVendedor && (
                              <Badge variant="outline" className="text-xs">
                                Vendedor
                              </Badge>
                            )}
                            {fullTemplate.isAdmin && (
                              <Badge variant="outline" className="text-xs">
                                Admin
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Personalizar Cargo</DialogTitle>
              <DialogDescription>
                Baseado no template: {selectedTemplate?.nomeCargo}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Nome do Cargo */}
              <div className="space-y-2">
                <Label htmlFor="nomeCargo">
                  Nome do Cargo <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="nomeCargo"
                  placeholder="Ex: Gerente de Vendas"
                  value={nomeCargo}
                  onChange={(e) => setNomeCargo(e.target.value)}
                  required
                  maxLength={100}
                  autoFocus
                />
              </div>

              {/* Descrição */}
              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  placeholder="Descrição do cargo"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  rows={3}
                  maxLength={500}
                />
              </div>

              {/* Cor */}
              <div className="space-y-2">
                <Label>Cor do Cargo</Label>
                <div className="grid grid-cols-5 gap-2">
                  {CORES_DISPONIVEIS.map((cor) => (
                    <button
                      key={cor.valor}
                      type="button"
                      className={`h-10 rounded-md border-2 transition-all hover:scale-110 ${
                        corSelecionada === cor.valor
                          ? 'border-foreground ring-2 ring-offset-2'
                          : 'border-transparent'
                      }`}
                      style={{ backgroundColor: cor.valor }}
                      onClick={() => setCorSelecionada(cor.valor)}
                      title={cor.nome}
                    />
                  ))}
                </div>
              </div>

              {/* Info do template */}
              {selectedTemplate && (
                <div className="rounded-lg bg-muted p-3 text-sm">
                  <p className="font-medium mb-2">Incluído neste template:</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <Key className="h-3 w-3" />
                      {selectedTemplate.permissoes.length} permissões
                      pré-configuradas
                    </li>
                    {selectedTemplate.isGestor && (
                      <li>• Perfil: Gestor de equipe</li>
                    )}
                    {selectedTemplate.isVendedor && <li>• Perfil: Vendedor</li>}
                    {selectedTemplate.isAdmin && (
                      <li>• Perfil: Administrador</li>
                    )}
                  </ul>
                  <p className="mt-2 text-xs">
                    Você poderá ajustar as permissões após a criação.
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={isPending}
              >
                Voltar
              </Button>
              <Button type="submit" disabled={isPending || !nomeCargo.trim()}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isPending ? 'Criando...' : 'Criar Cargo'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
