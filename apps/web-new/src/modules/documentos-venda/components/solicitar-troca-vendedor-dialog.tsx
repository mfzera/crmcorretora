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
import { Button } from '@/core/ui/button';
import { Textarea } from '@/core/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/core/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/core/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/core/ui/popover';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { cn } from '@/core/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useVendedores } from '@/modules/usuarios/http';
import { useSolicitarTrocaVendedor } from '../http';
import type { DocumentoVenda } from '@/types/documento-venda';

const schema = z.object({
  tipoVendedor: z.enum(['principal', 'secundario', 'terceiro']),
  novoVendedorId: z.string().uuid('Selecione o novo vendedor'),
  motivo: z.string().min(10, 'Informe o motivo (mínimo 10 caracteres)').max(1000),
});

type FormData = z.infer<typeof schema>;

interface Props {
  documento: DocumentoVenda;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TIPO_LABEL: Record<string, string> = {
  principal: 'Principal',
  secundario: 'Secundário',
  terceiro: 'Terciário',
};

export function SolicitarTrocaVendedorDialog({ documento, open, onOpenChange }: Props) {
  const [vendedorPopoverOpen, setVendedorPopoverOpen] = useState(false);
  const { data: vendedores = [] } = useVendedores();
  const solicitar = useSolicitarTrocaVendedor();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { tipoVendedor: 'principal', novoVendedorId: '', motivo: '' },
  });

  const tipoSelecionado = form.watch('tipoVendedor');
  const novoVendedorId = form.watch('novoVendedorId');

  // Vendedor atual para o tipo selecionado
  const vendedorAtualId =
    tipoSelecionado === 'principal'
      ? documento.vendedorId
      : tipoSelecionado === 'secundario'
        ? documento.vendedorSecundarioId
        : documento.vendedorTerceiroId;

  // Filtrar para não mostrar o vendedor atual
  const opcoes = vendedores.filter((v) => v.id !== vendedorAtualId);
  const vendedorSelecionado = vendedores.find((v) => v.id === novoVendedorId);

  const onSubmit = async (data: FormData) => {
    try {
      await solicitar.mutateAsync({ documentoId: documento.id, ...data });
      toast.success('Solicitação de troca de vendedor enviada para aprovação');
      form.reset();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao solicitar troca de vendedor');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Solicitar Troca de Vendedor</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="tipoVendedor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Vendedor</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="principal">Principal</SelectItem>
                      {documento.vendedorSecundarioId && (
                        <SelectItem value="secundario">Secundário</SelectItem>
                      )}
                      {documento.vendedorTerceiroId && (
                        <SelectItem value="terceiro">Terciário</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="novoVendedorId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Novo Vendedor {TIPO_LABEL[tipoSelecionado]}</FormLabel>
                  <Popover open={vendedorPopoverOpen} onOpenChange={setVendedorPopoverOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            'w-full justify-between font-normal',
                            !field.value && 'text-muted-foreground',
                          )}
                        >
                          {vendedorSelecionado?.nome ?? 'Selecionar vendedor...'}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                      <Command>
                        <CommandInput placeholder="Buscar vendedor..." />
                        <CommandList>
                          <CommandEmpty>Nenhum vendedor encontrado</CommandEmpty>
                          <CommandGroup>
                            {opcoes.map((v) => (
                              <CommandItem
                                key={v.id}
                                value={v.nome}
                                onSelect={() => {
                                  field.onChange(v.id);
                                  setVendedorPopoverOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    field.value === v.id ? 'opacity-100' : 'opacity-0',
                                  )}
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
              name="motivo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo da Troca</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva o motivo da solicitação de troca..."
                      className="resize-none"
                      rows={3}
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
                onClick={() => onOpenChange(false)}
                disabled={solicitar.isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={solicitar.isPending}>
                {solicitar.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enviar Solicitação
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
