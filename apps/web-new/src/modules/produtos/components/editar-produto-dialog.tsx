
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Pencil } from 'lucide-react';
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/core/ui/form';
import { Input } from '@/core/ui/input';
import { Textarea } from '@/core/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/core/ui/select';
import { Switch } from '@/core/ui/switch';
import { toast } from 'sonner';
import { handleApiError, applyApiErrorsToForm } from '@/core/utils/handle-api-error';
import { useProduto, useAtualizarProduto } from '@/modules/produtos/http';

import { TipoSeguro, getTipoSeguroLabel } from '@/types/produto';

const schema = z
  .object({
    nomeProduto: z
      .string()
      .min(2, 'Nome deve ter no mínimo 2 caracteres')
      .max(256, 'Nome deve ter no máximo 256 caracteres'),
    descricao: z
      .string()
      .max(1000, 'Descrição deve ter no máximo 1000 caracteres')
      .optional(),
    tipoSeguro: z.nativeEnum(TipoSeguro, {
      error: 'Selecione um tipo de seguro',
    }),
    premioMinimo: z
      .string()
      .optional()
      .transform((val) => (val && val !== '' ? parseFloat(val) : undefined)),
    premioMaximo: z
      .string()
      .optional()
      .transform((val) => (val && val !== '' ? parseFloat(val) : undefined)),
    percentualComissaoPadrao: z
      .string()
      .optional()
      .transform((val) => (val && val !== '' ? parseFloat(val) : undefined)),
    ativo: z.boolean(),
  })
  .refine(
    (data) => {
      if (data.premioMinimo !== undefined && data.premioMaximo !== undefined) {
        return data.premioMinimo <= data.premioMaximo;
      }
      return true;
    },
    {
      message: 'Prêmio mínimo não pode ser maior que o máximo',
      path: ['premioMaximo'],
    },
  )
  .refine(
    (data) => {
      if (data.percentualComissaoPadrao !== undefined) {
        return (
          data.percentualComissaoPadrao >= 0 &&
          data.percentualComissaoPadrao <= 100
        );
      }
      return true;
    },
    {
      message: 'Percentual deve estar entre 0 e 100',
      path: ['percentualComissaoPadrao'],
    },
  );

type FormData = z.infer<typeof schema>;
type FormInput = z.input<typeof schema>;

interface EditarProdutoDialogProps {
  produtoId: string;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function EditarProdutoDialog({
  produtoId,
  trigger,
  onSuccess,
}: EditarProdutoDialogProps) {
  const [open, setOpen] = useState(false);
  const { data: produto, isLoading } = useProduto(open ? produtoId : null);
  const atualizarProduto = useAtualizarProduto();

  const form = useForm<FormInput>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      nomeProduto: '',
      descricao: '',
      tipoSeguro: undefined,
      premioMinimo: '',
      premioMaximo: '',
      percentualComissaoPadrao: '',
      ativo: true,
    },
  });

  useEffect(() => {
    if (produto) {
      form.reset({
        nomeProduto: produto.nomeProduto,
        descricao: produto.descricao || '',
        tipoSeguro: produto.tipoSeguro,
        premioMinimo: produto.premioMinimo || '',
        premioMaximo: produto.premioMaximo || '',
        percentualComissaoPadrao: produto.percentualComissaoPadrao || '',
        ativo: produto.ativo,
      });
    }
  }, [produto, form]);

  const handleSubmit = async (data: FormData) => {
    try {
      await atualizarProduto.mutateAsync({
        id: produtoId,
        data: {
          nomeProduto: data.nomeProduto,
          descricao: data.descricao || undefined,
          tipoSeguro: data.tipoSeguro,
          premioMinimo: data.premioMinimo,
          premioMaximo: data.premioMaximo,
          percentualComissaoPadrao: data.percentualComissaoPadrao,
          ativo: data.ativo,
        },
      });

      toast.success('Produto atualizado com sucesso!');
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      if (!applyApiErrorsToForm(error, form.setError)) {
        toast.error(handleApiError(error));
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon">
            <Pencil className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Produto</DialogTitle>
          <DialogDescription>
            Atualize as informações do produto de seguro
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">
            Carregando produto...
          </div>
        ) : (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit as any)}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nome do Produto */}
                <FormField
                  control={form.control as any}
                  name="nomeProduto"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Nome do Produto *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: Seguro Auto Premium"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Tipo de Seguro */}
                <FormField
                  control={form.control as any}
                  name="tipoSeguro"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Tipo de Seguro *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo de seguro" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.values(TipoSeguro).map((tipo) => (
                            <SelectItem key={tipo} value={tipo}>
                              {getTipoSeguroLabel(tipo)}
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
                  control={form.control as any}
                  name="descricao"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Descrição</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Descrição do produto..."
                          className="resize-none"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>Máximo 1000 caracteres</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Prêmio Mínimo */}
                <FormField
                  control={form.control as any}
                  name="premioMinimo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prêmio Mínimo (R$)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0,00"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>Valor mínimo do prêmio</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Prêmio Máximo */}
                <FormField
                  control={form.control as any}
                  name="premioMaximo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prêmio Máximo (R$)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0,00"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>Valor máximo do prêmio</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Percentual Comissão Padrão */}
                <FormField
                  control={form.control as any}
                  name="percentualComissaoPadrao"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Comissão Padrão (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          placeholder="0,00"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Percentual de comissão padrão (0 a 100%)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Status Ativo */}
                <FormField
                  control={form.control as any}
                  name="ativo"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 md:col-span-2">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Produto Ativo
                        </FormLabel>
                        <FormDescription>
                          Produtos inativos não aparecem para seleção
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={atualizarProduto.isPending}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={atualizarProduto.isPending}>
                  {atualizarProduto.isPending
                    ? 'Salvando...'
                    : 'Salvar Alterações'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
