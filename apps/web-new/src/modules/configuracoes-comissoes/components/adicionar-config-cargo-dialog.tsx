
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/core/ui/select';
import { Input } from '@/core/ui/input';
import { Button } from '@/core/ui/button';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCargos } from '@/modules/cargos/http';
import { useUpsertConfigCargo, type TipoNegocio } from '../http';
import { TipoSeguroSelect } from './tipo-seguro-select';

const schema = z.object({
  cargoId: z.string().uuid('Selecione um cargo'),
  tipoSeguro: z.string().min(1, 'Selecione o tipo de seguro'),
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

export function AdicionarConfigCargoDialog({ open, onOpenChange }: Props) {
  const { data: cargos = [] } = useCargos();
  const upsertConfig = useUpsertConfigCargo();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { cargoId: '', tipoSeguro: '', tipoNegocio: null, percentualParticipacao: 0 },
  });

  const onSubmit = async (data: FormData) => {
    await upsertConfig.mutateAsync({ ...data, tipoNegocio: data.tipoNegocio ?? null });
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configuração por cargo</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="cargoId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cargo</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar cargo..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {cargos.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nomeCargo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
              <Button type="submit" disabled={upsertConfig.isPending}>
                {upsertConfig.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
