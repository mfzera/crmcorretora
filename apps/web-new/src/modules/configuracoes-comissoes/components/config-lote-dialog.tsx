
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
import { Badge } from '@/core/ui/badge';
import { Checkbox } from '@/core/ui/checkbox';
import { ScrollArea } from '@/core/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/core/ui/select';
import { Loader2, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useVendedores } from '@/modules/usuarios/http';
import { useCreateBatchConfigs, type TipoNegocio } from '../http';
import { TipoSeguroSelect } from './tipo-seguro-select';

const schema = z.object({
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
}

export function ConfigLoteDialog({ open, onOpenChange }: Props) {
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [busca, setBusca] = useState('');
  const { data: vendedores = [] } = useVendedores();
  const criarLote = useCreateBatchConfigs();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { tipoSeguro: '', tipoNegocio: null, percentualParticipacao: 0 },
  });

  const vendedoresFiltrados = vendedores.filter((v) =>
    v.nome.toLowerCase().includes(busca.toLowerCase()),
  );

  const toggleVendedor = (id: string) => {
    setSelecionados((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const toggleTodos = () => {
    if (selecionados.length === vendedoresFiltrados.length) {
      setSelecionados([]);
    } else {
      setSelecionados(vendedoresFiltrados.map((v) => v.id));
    }
  };

  const onSubmit = async (data: FormData) => {
    if (selecionados.length === 0) return;
    await criarLote.mutateAsync({
      usuarioIds: selecionados,
      tipoSeguro: data.tipoSeguro,
      tipoNegocio: data.tipoNegocio ?? null,
      percentualParticipacao: data.percentualParticipacao,
    });
    form.reset();
    setSelecionados([]);
    onOpenChange(false);
  };

  const nomesSelecionados = vendedores
    .filter((v) => selecionados.includes(v.id))
    .map((v) => v.nome);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Configurar comissão em lote</DialogTitle>
          <DialogDescription>
            Aplica o mesmo percentual para múltiplos vendedores de uma vez. Cria ou sobrescreve a configuração existente.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

            {/* Seleção de vendedores */}
            <div className="space-y-2">
              <FormLabel>Vendedores</FormLabel>
              <Input
                placeholder="Filtrar vendedores..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="h-8 text-sm"
              />
              <ScrollArea className="h-[180px] rounded-md border p-2">
                <div className="space-y-1">
                  <div
                    className="flex items-center gap-2 px-1 py-1 rounded hover:bg-muted/50 cursor-pointer"
                    onClick={toggleTodos}
                  >
                    <Checkbox
                      checked={selecionados.length === vendedoresFiltrados.length && vendedoresFiltrados.length > 0}
                    />
                    <span className="text-sm font-medium">Selecionar todos</span>
                  </div>
                  {vendedoresFiltrados.map((v) => (
                    <div
                      key={v.id}
                      className="flex items-center gap-2 px-1 py-1 rounded hover:bg-muted/50 cursor-pointer"
                      onClick={() => toggleVendedor(v.id)}
                    >
                      <Checkbox checked={selecionados.includes(v.id)} />
                      <span className="text-sm">{v.nome}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              {selecionados.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {nomesSelecionados.slice(0, 4).map((nome) => (
                    <Badge key={nome} variant="secondary" className="text-xs font-normal">
                      {nome}
                      <button
                        type="button"
                        className="ml-1 hover:text-destructive"
                        onClick={() => {
                          const v = vendedores.find((x) => x.nome === nome);
                          if (v) toggleVendedor(v.id);
                        }}
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </Badge>
                  ))}
                  {nomesSelecionados.length > 4 && (
                    <Badge variant="secondary" className="text-xs font-normal">
                      +{nomesSelecionados.length - 4} mais
                    </Badge>
                  )}
                </div>
              )}
            </div>

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
              <Button type="submit" disabled={criarLote.isPending || selecionados.length === 0}>
                {criarLote.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Aplicar para {selecionados.length} vendedor{selecionados.length !== 1 ? 'es' : ''}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
