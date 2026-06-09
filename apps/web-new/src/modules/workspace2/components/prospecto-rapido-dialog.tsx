import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/core/ui/dialog';
import { Button } from '@/core/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/core/ui/form';
import { Input } from '@/core/ui/input';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/core/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/core/ui/popover';
import { cn } from '@/core/utils';
import { useCreateProspecto } from '@/modules/area-trabalho/http';
import { useProdutos } from '@/modules/produtos/http';
import { handleApiError } from '@/core/utils/handle-api-error';

const schema = z.object({
  nome: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  produtoId: z.string().uuid('Selecione um produto'),
});
type FormValues = z.infer<typeof schema>;

interface ProspectoRapidoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCriado?: () => void;
}

export function ProspectoRapidoDialog({ open, onOpenChange, onCriado }: ProspectoRapidoDialogProps) {
  const [produtoOpen, setProdutoOpen] = useState(false);
  const [produtoSearch, setProdutoSearch] = useState('');

  const { data: produtosRaw } = useProdutos({ ativo: true, search: produtoSearch || undefined }, 1, 50);
  const produtos = (produtosRaw as any)?.data ?? [];

  const createProspecto = useCreateProspecto();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { nome: '', produtoId: '' },
  });

  const produtoSelecionado = produtos.find((p: any) => p.id === form.watch('produtoId'));

  const onSubmit = async (values: FormValues) => {
    try {
      await createProspecto.mutateAsync(values);
      toast.success('Prospecto criado com sucesso!');
      form.reset();
      onOpenChange(false);
      onCriado?.();
    } catch (err) {
      toast.error(handleApiError(err));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Criar sem cliente cadastrado</DialogTitle>
          <DialogDescription>
            Preencha apenas o necessário agora. Para prospectar ou confirmar venda, complete os dados do cliente depois.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do prospecto</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: João Silva" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="produtoId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Produto</FormLabel>
                  <Popover open={produtoOpen} onOpenChange={setProdutoOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn('w-full justify-between font-normal', !field.value && 'text-muted-foreground')}
                        >
                          {produtoSelecionado?.nomeProduto ?? 'Selecione um produto'}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput
                          placeholder="Buscar produto..."
                          value={produtoSearch}
                          onValueChange={setProdutoSearch}
                        />
                        <CommandList>
                          <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
                          <CommandGroup>
                            {produtos.map((p: any) => (
                              <CommandItem
                                key={p.id}
                                value={p.nomeProduto}
                                onSelect={() => {
                                  field.onChange(p.id);
                                  setProdutoOpen(false);
                                }}
                              >
                                <Check className={cn('mr-2 h-4 w-4', field.value === p.id ? 'opacity-100' : 'opacity-0')} />
                                {p.nomeProduto}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={createProspecto.isPending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createProspecto.isPending}>
                {createProspecto.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar prospecto
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
