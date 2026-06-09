
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/core/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/core/ui/form';
import { Input } from '@/core/ui/input';
import { Button } from '@/core/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/core/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/core/ui/popover';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { cn } from '@/core/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useVendedores } from '@/modules/usuarios/http';
import { useCreateConfigVendedor, type TipoNegocio } from '../http';
import { TipoSeguroSelect } from './tipo-seguro-select';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/core/ui/select';

const schema = z.object({
  usuarioId: z.string().uuid('Selecione um vendedor'),
  tipoSeguro: z.string().min(1, 'Informe o tipo de seguro'),
  tipoNegocio: z.enum(['NOVO', 'RENOVACAO']).nullable().optional(),
  percentualParticipacao: z
    .number({ error: 'Informe um número' })
    .min(0)
    .max(100),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tiposExistentes?: string[];
}

export function AdicionarConfigVendedorDialog({ open, onOpenChange, tiposExistentes = [] }: Props) {
  const [vendedorPopoverOpen, setVendedorPopoverOpen] = useState(false);
  const { data: vendedores = [] } = useVendedores();
  const createConfig = useCreateConfigVendedor();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { usuarioId: '', tipoSeguro: '', tipoNegocio: null, percentualParticipacao: 0 },
  });

  const onSubmit = async (data: FormData) => {
    await createConfig.mutateAsync({ ...data, tipoNegocio: data.tipoNegocio ?? null });
    form.reset();
    onOpenChange(false);
  };

  const selectedVendedor = vendedores.find((v) => v.id === form.watch('usuarioId'));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar configuração específica</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="usuarioId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vendedor</FormLabel>
                  <Popover open={vendedorPopoverOpen} onOpenChange={setVendedorPopoverOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn('w-full justify-between', !field.value && 'text-muted-foreground')}
                        >
                          {selectedVendedor?.nome ?? 'Selecionar vendedor...'}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[320px] p-0">
                      <Command>
                        <CommandInput placeholder="Buscar vendedor..." />
                        <CommandList>
                          <CommandEmpty>Nenhum vendedor encontrado.</CommandEmpty>
                          <CommandGroup>
                            {vendedores.map((v) => (
                              <CommandItem
                                key={v.id}
                                value={v.nome}
                                onSelect={() => {
                                  field.onChange(v.id);
                                  setVendedorPopoverOpen(false);
                                }}
                              >
                                <Check
                                  className={cn('mr-2 h-4 w-4', field.value === v.id ? 'opacity-100' : 'opacity-0')}
                                />
                                {v.nome}
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

            <FormField
              control={form.control}
              name="tipoSeguro"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de seguro</FormLabel>
                  <FormControl>
                    <TipoSeguroSelect value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tipoNegocio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de negócio</FormLabel>
                  <Select
                    value={field.value ?? '__ambos'}
                    onValueChange={(v) => field.onChange(v === '__ambos' ? null : (v as TipoNegocio))}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__ambos">Ambos (Novo e Renovação)</SelectItem>
                      <SelectItem value="NOVO">Novo</SelectItem>
                      <SelectItem value="RENOVACAO">Renovação</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="percentualParticipacao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>% de participação na comissão</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={0.01}
                        placeholder="Ex: 10"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                        %
                      </span>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createConfig.isPending}>
                {createConfig.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
