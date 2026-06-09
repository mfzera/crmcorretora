
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Calendar,
  DollarSign,
  FileText,
  User,
  Building2,
  Package,
  Edit,
  Eye,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/core/ui/dialog';
import { Button } from '@/core/ui/button';
import { Badge } from '@/core/ui/badge';
import { Separator } from '@/core/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/core/ui/tabs';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/core/ui/form';
import { Input } from '@/core/ui/input';
import { Textarea } from '@/core/ui/textarea';
import type { Proposta } from '@/types/area-trabalho';
import { toast } from 'sonner';
import { handleApiError } from '@/core/utils/handle-api-error';
import { formatDateBR } from '@/core/utils/date-utils';

const editPropostaSchema = z
  .object({
    numeroPropostaExterno: z.string().optional(),
    vigenciaInicio: z.string().min(1, 'Informe a data de início'),
    vigenciaFim: z.string().min(1, 'Informe a data de fim'),
    premioLiquido: z.string().optional(),
    percentualComissao: z.string().optional(),
    observacoes: z.string().optional(),
  })
  .refine((data) => data.vigenciaFim > data.vigenciaInicio, {
    message: 'A data de fim deve ser posterior à data de início',
    path: ['vigenciaFim'],
  });

type EditPropostaForm = z.infer<typeof editPropostaSchema>;

interface PropostaDialogProps {
  proposta: Proposta | null;
  open: boolean;
  mode: 'view' | 'edit';
  onClose: () => void;
  onSave?: (data: EditPropostaForm) => Promise<void>;
  onConfirmarVenda?: () => Promise<void>;
}

const getStatusBadge = (status: string) => {
  const variants: Record<string, any> = {
    AGUARDANDO_ENVIO: 'secondary',
    ENVIADA: 'default',
    EM_ANALISE: 'warning',
    PENDENTE_DOCUMENTACAO: 'warning',
    APROVADA: 'success',
    APROVADA_CONDICIONAL: 'warning',
    RECUSADA: 'destructive',
    CANCELADA: 'destructive',
    VENDA_CONFIRMADA: 'success',
  };

  const labels: Record<string, string> = {
    AGUARDANDO_ENVIO: 'Aguardando Envio',
    ENVIADA: 'Enviada',
    EM_ANALISE: 'Em Análise',
    PENDENTE_DOCUMENTACAO: 'Pendente Documentação',
    APROVADA: 'Aprovada',
    APROVADA_CONDICIONAL: 'Aprovada Condicional',
    RECUSADA: 'Recusada',
    CANCELADA: 'Cancelada',
    VENDA_CONFIRMADA: 'Venda Confirmada',
  };

  return (
    <Badge variant={variants[status] || 'default'}>
      {labels[status] || status}
    </Badge>
  );
};

export function PropostaDialog({
  proposta,
  open,
  mode,
  onClose,
  onSave,
  onConfirmarVenda,
}: PropostaDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirmingVenda, setIsConfirmingVenda] = useState(false);

  const form = useForm<EditPropostaForm>({
    resolver: zodResolver(editPropostaSchema),
    defaultValues: proposta
      ? {
          numeroPropostaExterno: proposta.numeroPropostaExterno || '',
          vigenciaInicio: proposta.vigenciaInicio?.split('T')[0] ?? '',
          vigenciaFim: proposta.vigenciaFim?.split('T')[0] ?? '',
          premioLiquido: proposta.premioLiquido?.toString() || '',
          percentualComissao: proposta.percentualComissao?.toString() || '',
          observacoes: proposta.observacoes || '',
        }
      : undefined,
  });

  if (!proposta) return null;

  const nomeCliente =
    proposta.cliente.tipoPessoa === 'PF'
      ? proposta.cliente.nome
      : proposta.cliente.nomeFantasia || proposta.cliente.razaoSocial;

  const handleSubmit = async (data: EditPropostaForm) => {
    if (!onSave) return;

    try {
      setIsLoading(true);
      await onSave(data);
      toast.success('Proposta atualizada com sucesso!');
      onClose();
    } catch (error) {
      toast.error(handleApiError(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmarVenda = async () => {
    if (!onConfirmarVenda) return;

    try {
      setIsConfirmingVenda(true);
      await onConfirmarVenda();
      toast.success('Venda confirmada com sucesso!');
      onClose();
    } catch (error) {
      toast.error(handleApiError(error));
    } finally {
      setIsConfirmingVenda(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'edit' ? (
              <Edit className="h-5 w-5 text-primary" />
            ) : (
              <Eye className="h-5 w-5 text-primary" />
            )}
            {mode === 'edit' ? 'Editar Proposta' : 'Detalhes da Proposta'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'edit'
              ? 'Altere as informações da proposta abaixo'
              : 'Informações completas sobre a proposta'}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="geral" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="geral">Informações Gerais</TabsTrigger>
            <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
          </TabsList>

          <TabsContent value="geral" className="space-y-4 mt-4">
            {/* Status e Números */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Número Interno</p>
                <p className="text-lg font-semibold">{proposta.numero}</p>
                {proposta.numeroPropostaExterno && (
                  <>
                    <p className="text-xs text-muted-foreground">
                      Número Externo
                    </p>
                    <p className="text-sm font-medium">
                      {proposta.numeroPropostaExterno}
                    </p>
                  </>
                )}
              </div>
              {getStatusBadge(proposta.status)}
            </div>

            <Separator />

            {mode === 'view' ? (
              /* Modo Visualização */
              <div className="space-y-4">
                {/* Cliente */}
                <div className="space-y-3">
                  <h3 className="flex items-center gap-2 font-semibold text-sm">
                    {proposta.cliente.tipoPessoa === 'PF' ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <Building2 className="h-4 w-4" />
                    )}
                    Cliente
                  </h3>
                  <div className="rounded-lg border bg-muted/50 p-4">
                    <p className="font-medium">{nomeCliente}</p>
                    <p className="text-sm text-muted-foreground">
                      {proposta.cliente.tipoPessoa === 'PF'
                        ? 'Pessoa Física'
                        : 'Pessoa Jurídica'}
                    </p>
                  </div>
                </div>

                {/* Produto */}
                <div className="space-y-3">
                  <h3 className="flex items-center gap-2 font-semibold text-sm">
                    <Package className="h-4 w-4" />
                    Produto
                  </h3>
                  <div className="rounded-lg border bg-muted/50 p-4">
                    <p className="font-medium">
                      {proposta.produto.nomeProduto}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {proposta.produto.tipoSeguro}
                    </p>
                  </div>
                </div>

                {/* Vigência */}
                <div className="space-y-3">
                  <h3 className="flex items-center gap-2 font-semibold text-sm">
                    <Calendar className="h-4 w-4" />
                    Vigência
                  </h3>
                  <div className="rounded-lg border bg-muted/50 p-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <span className="text-sm text-muted-foreground">
                          Início:
                        </span>
                        <p className="font-medium">
                          {formatDateBR(proposta.vigenciaInicio)}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">
                          Fim:
                        </span>
                        <p className="font-medium">
                          {formatDateBR(proposta.vigenciaFim)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Valores */}
                <div className="space-y-3">
                  <h3 className="flex items-center gap-2 font-semibold text-sm">
                    <DollarSign className="h-4 w-4" />
                    Valores
                  </h3>
                  <div className="rounded-lg border bg-muted/50 p-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <span className="text-sm text-muted-foreground">
                          Prêmio Líquido:
                        </span>
                        <p className="font-medium text-lg">
                          {proposta.premioLiquido
                            ? proposta.premioLiquido.toLocaleString('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                              })
                            : 'Não informado'}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">
                          Comissão:
                        </span>
                        <p className="font-medium text-lg">
                          {proposta.percentualComissao
                            ? `${proposta.percentualComissao}%`
                            : 'Não informado'}
                        </p>
                      </div>
                    </div>
                    {proposta.premioLiquido && proposta.percentualComissao && (
                      <div className="mt-3 pt-3 border-t">
                        <span className="text-sm text-muted-foreground">
                          Comissão Estimada:
                        </span>
                        <p className="font-semibold text-xl text-green-600">
                          {(
                            (proposta.premioLiquido *
                              proposta.percentualComissao) /
                            100
                          ).toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Observações */}
                {proposta.observacoes && (
                  <div>
                    <span className="text-sm text-muted-foreground">
                      Observações:
                    </span>
                    <p className="mt-1 rounded-lg border bg-muted/50 p-3 text-sm">
                      {proposta.observacoes}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              /* Modo Edição */
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(handleSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="numeroPropostaExterno"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Número da Proposta Externa (opcional)
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: SEG-2025-001" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="vigenciaInicio"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Início da Vigência</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="vigenciaFim"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fim da Vigência</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="premioLiquido"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prêmio Líquido</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="R$ 0,00"
                              step="0.01"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="percentualComissao"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Comissão (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="0%"
                              step="0.01"
                              max="100"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="observacoes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Observações</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Digite observações sobre esta proposta..."
                            className="resize-none"
                            rows={4}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </form>
              </Form>
            )}
          </TabsContent>

          <TabsContent value="detalhes" className="space-y-4 mt-4">
            <div className="space-y-3">
              <div>
                <span className="text-sm text-muted-foreground">
                  Criada em:
                </span>
                <p className="font-medium">
                  {new Date(proposta.criadoEm).toLocaleString('pt-BR')}
                </p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">
                  Última atualização:
                </span>
                <p className="font-medium">
                  {new Date(proposta.atualizadoEm).toLocaleString('pt-BR')}
                </p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">ID:</span>
                <p className="font-mono text-sm">{proposta.id}</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {mode === 'edit' ? 'Cancelar' : 'Fechar'}
          </Button>
          {mode === 'view' &&
            proposta.status === 'APROVADA' &&
            onConfirmarVenda && (
              <Button
                onClick={handleConfirmarVenda}
                disabled={isConfirmingVenda}
                className="bg-green-600 hover:bg-green-700"
              >
                {isConfirmingVenda && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Confirmar Venda
              </Button>
            )}
          {mode === 'edit' && (
            <Button
              onClick={form.handleSubmit(handleSubmit)}
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Alterações
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
