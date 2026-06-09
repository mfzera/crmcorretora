
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AnexoUploader } from '@/modules/anexos/components/anexo-uploader';
import { AnexoList } from '@/modules/anexos/components/anexo-list';
import { Paperclip } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Button } from '@/core/ui/button';
import { Input } from '@/core/ui/input';
import { Textarea } from '@/core/ui/textarea';
import { toast } from 'sonner';
import { handleApiError } from '@/core/utils/handle-api-error';
import { useCriarEndosso } from '../http';
import { useQueryClient } from '@tanstack/react-query';
import { FileEdit, Loader2 } from 'lucide-react';
import type { TipoEndosso } from '@/types/area-trabalho';
import type { DocumentoVenda } from '@/types/documento-venda';

const tiposEndosso: { value: TipoEndosso; label: string }[] = [
  { value: 'INCLUSAO_COBERTURA', label: 'Inclusão de Cobertura' },
  { value: 'EXCLUSAO_COBERTURA', label: 'Exclusão de Cobertura' },
  { value: 'ALTERACAO_VALOR', label: 'Alteração de Valor' },
  { value: 'INCLUSAO_ITEM', label: 'Inclusão de Item' },
  { value: 'EXCLUSAO_ITEM', label: 'Exclusão de Item' },
  { value: 'ALTERACAO_DADOS', label: 'Alteração de Dados' },
  { value: 'ALTERACAO_VIGENCIA', label: 'Alteração de Vigência' },
  { value: 'TRANSFERENCIA_SEGURADO', label: 'Transferência de Segurado' },
  { value: 'SUBSTITUICAO_VEICULO', label: 'Substituição de Veículo' },
  { value: 'CANCELAMENTO', label: 'Cancelamento' },
  { value: 'OUTROS', label: 'Outros' },
];

const endossoSchema = z.object({
  tipoEndosso: z.enum([
    'INCLUSAO_COBERTURA',
    'EXCLUSAO_COBERTURA',
    'ALTERACAO_VALOR',
    'INCLUSAO_ITEM',
    'EXCLUSAO_ITEM',
    'ALTERACAO_DADOS',
    'ALTERACAO_VIGENCIA',
    'TRANSFERENCIA_SEGURADO',
    'SUBSTITUICAO_VEICULO',
    'CANCELAMENTO',
    'OUTROS',
  ]),
  descricao: z.string().min(10, 'Descrição deve ter no mínimo 10 caracteres'),
  motivoEndosso: z.string().optional(),
  premioNovo: z.coerce.number().min(0).optional(),
  percentualComissaoNovo: z.coerce.number().min(0).max(100).optional(),
  dataVigenciaEndosso: z.string(),
});

type EndossoFormData = z.infer<typeof endossoSchema>;

interface CriarEndossoDialogProps {
  documento: DocumentoVenda;
  trigger?: React.ReactNode;
}

export function CriarEndossoDialog({
  documento,
  trigger,
}: CriarEndossoDialogProps) {
  const [open, setOpen] = useState(false);
  const [endossoId, setEndossoId] = useState<string | null>(null);
  const criarEndosso = useCriarEndosso();
  const queryClient = useQueryClient();

  const form = useForm<EndossoFormData>({
    resolver: zodResolver(endossoSchema) as never,
    defaultValues: {
      tipoEndosso: 'ALTERACAO_VALOR',
      descricao: '',
      motivoEndosso: '',
      premioNovo: documento.premioLiquido ?? 0,
      percentualComissaoNovo: documento.percentualComissao ?? 0,
      dataVigenciaEndosso: (() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`; })(),
    },
  });

  const premioAtual = documento.premioLiquido ?? 0;
  const comissaoAtual = documento.percentualComissao ?? 0;
  const premioNovo = form.watch('premioNovo');
  const comissaoNova = form.watch('percentualComissaoNovo');

  const diferencaPremio = (premioNovo || 0) - premioAtual;
  const valorComissaoAtual = (premioAtual * comissaoAtual) / 100;
  const valorComissaoNova = ((premioNovo || 0) * (comissaoNova || 0)) / 100;
  const diferencaComissao = valorComissaoNova - valorComissaoAtual;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleClose = () => {
    queryClient.invalidateQueries({ queryKey: ['area-trabalho', 'endossos'] });
    queryClient.invalidateQueries({ queryKey: ['area-trabalho', 'resumo'] });
    setOpen(false);
    setEndossoId(null);
    form.reset();
  };

  const onSubmit = async (data: EndossoFormData) => {
    try {
      const endosso = await criarEndosso.mutateAsync({
        documentoVendaId: documento.id,
        tipoEndosso: data.tipoEndosso,
        descricao: data.descricao,
        motivoEndosso: data.motivoEndosso,
        premioNovo: data.premioNovo,
        percentualComissaoNovo: data.percentualComissaoNovo,
        dataVigenciaEndosso: data.dataVigenciaEndosso,
      });

      toast.success('Endosso criado', {
        description: 'Adicione os documentos necessários e clique em Finalizar.',
      });

      setEndossoId(endosso.id);
    } catch (error) {
      toast.error(handleApiError(error));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <FileEdit className="h-4 w-4 mr-2" />
            Solicitar Endosso
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Solicitar Endosso</DialogTitle>
          <DialogDescription>
            Apólice: {documento.numeroApoliceExterna || documento.numero}
          </DialogDescription>
        </DialogHeader>

        {endossoId ? (
          <div className="space-y-6">
            <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-lg p-4">
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                Endosso criado com sucesso! Adicione os documentos necessários abaixo (opcional).
              </p>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Paperclip className="size-4" />
                Anexos
              </h4>
              <AnexoUploader entidade="endosso" entidadeId={endossoId} maxFiles={10} />
              <AnexoList entidade="endosso" entidadeId={endossoId} />
            </div>

            <DialogFooter>
              <Button onClick={handleClose}>Finalizar</Button>
            </DialogFooter>
          </div>
        ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Tipo de Endosso */}
            <FormField
              control={form.control}
              name="tipoEndosso"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Endosso *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {tiposEndosso.map((tipo) => (
                        <SelectItem key={tipo.value} value={tipo.value}>
                          {tipo.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Descrição */}
            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição das Alterações *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva detalhadamente as alterações solicitadas..."
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>Mínimo 10 caracteres</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Valores */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="premioNovo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Novo Prêmio Líquido</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Atual: {formatCurrency(premioAtual)}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="percentualComissaoNovo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nova % Comissão</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Atual: {comissaoAtual.toFixed(2)}%
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Preview de Diferenças */}
              <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                <h4 className="text-sm font-semibold">Resumo das Alterações</h4>

                <div>
                  <p className="text-xs text-muted-foreground">
                    Diferença de Prêmio
                  </p>
                  <p
                    className={`text-lg font-semibold ${
                      diferencaPremio >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {diferencaPremio >= 0 ? '+' : ''}
                    {formatCurrency(diferencaPremio)}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">
                    Valor da Comissão
                  </p>
                  <p className="text-sm">
                    {formatCurrency(valorComissaoAtual)} →{' '}
                    <span className="font-semibold">
                      {formatCurrency(valorComissaoNova)}
                    </span>
                  </p>
                  <p
                    className={`text-sm font-medium ${
                      diferencaComissao >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {diferencaComissao >= 0 ? '+' : ''}
                    {formatCurrency(diferencaComissao)}
                  </p>
                </div>
              </div>
            </div>

            {/* Data de Vigência */}
            <FormField
              control={form.control}
              name="dataVigenciaEndosso"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data de Vigência do Endosso *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormDescription>
                    Data em que o endosso entrará em vigor
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Motivo */}
            <FormField
              control={form.control}
              name="motivoEndosso"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo do Endosso</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Explique o motivo da solicitação..."
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={criarEndosso.isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={criarEndosso.isPending}>
                {criarEndosso.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Solicitar Endosso
              </Button>
            </DialogFooter>
          </form>
        </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
