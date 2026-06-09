
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus } from 'lucide-react';
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
import { toast } from 'sonner';
import { handleApiError, applyApiErrorsToForm } from '@/core/utils/handle-api-error';
import { useCriarProduto } from '@/modules/produtos/http';
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

interface NovoProdutoDialogProps {
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function NovoProdutoDialog({
  trigger,
  onSuccess,
}: NovoProdutoDialogProps) {
  const [open, setOpen] = useState(false);
  const criarProduto = useCriarProduto();

  const form = useForm<FormInput>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      nomeProduto: '',
      descricao: '',
      tipoSeguro: undefined,
      premioMinimo: '',
      premioMaximo: '',
      percentualComissaoPadrao: '',
    },
  });

  const handleSubmit = async (data: FormData) => {
    try {
      await criarProduto.mutateAsync({
        nomeProduto: data.nomeProduto,
        descricao: data.descricao || undefined,
        tipoSeguro: data.tipoSeguro,
        premioMinimo: data.premioMinimo,
        premioMaximo: data.premioMaximo,
        percentualComissaoPadrao: data.percentualComissaoPadrao,
        ativo: true,
      });

      toast.success('Produto cadastrado com sucesso!');
      setOpen(false);
      form.reset();
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
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Novo Produto
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Produto de Seguro</DialogTitle>
          <DialogDescription>
            Cadastre um novo produto de seguro para sua seguradora
          </DialogDescription>
        </DialogHeader>
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
                      <Input placeholder="Ex: Seguro Auto Premium" {...field} />
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
                    <Select onValueChange={field.onChange} value={field.value}>
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
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={criarProduto.isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={criarProduto.isPending}>
                {criarProduto.isPending ? 'Cadastrando...' : 'Cadastrar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
