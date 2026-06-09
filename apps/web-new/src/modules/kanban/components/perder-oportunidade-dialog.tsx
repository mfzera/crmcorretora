
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useState } from 'react';
import { dayjs } from '@/core/utils/date-utils';
import { XCircle } from 'lucide-react';
import { cn } from '@/core/utils';
import { useMoverOportunidade, usePerderOportunidade } from '../http';
import {
  Dialog,
  DialogContent,
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
import { Textarea } from '@/core/ui/textarea';
import { Button } from '@/core/ui/button';
import { RadioGroup, RadioGroupItem } from '@/core/ui/radio-group';
import { Label } from '@/core/ui/label';
import { DateInput } from '@/core/ui/date-input';
import { toast } from 'sonner';
import { handleApiError } from '@/core/utils/handle-api-error';
import type { Oportunidade } from '@/types/kanban';

const MOTIVOS_PERDA = [
  'Preço alto',
  'Concorrente ganhou',
  'Cliente desistiu',
  'Sem resposta',
  'Fora do perfil',
  'Produto não adequado',
  'Outro',
];

const passo1Schema = z.object({
  motivoPerda: z.string().min(1, 'Selecione o motivo da perda'),
  detalhesPerda: z.string().optional(),
  agendarRecontato: z.enum(['sim', 'nao']),
});

const passo2Schema = z.object({
  dataRecontato: z.string().min(1, 'Selecione a data de recontato'),
  observacaoRecontato: z.string().optional(),
});

type Passo1Form = z.infer<typeof passo1Schema>;
type Passo2Form = z.infer<typeof passo2Schema>;

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">{label}</p>
      {children}
    </div>
  );
}

interface PerderOportunidadeDialogProps {
  oportunidade: Oportunidade | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PerderOportunidadeDialog({ oportunidade, open, onOpenChange }: PerderOportunidadeDialogProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [passo1Data, setPasso1Data] = useState<Passo1Form | null>(null);

  const perderOportunidade = usePerderOportunidade();
  const moverOportunidade = useMoverOportunidade();

  const form1 = useForm<Passo1Form>({
    resolver: zodResolver(passo1Schema) as any,
    defaultValues: { motivoPerda: '', detalhesPerda: '', agendarRecontato: 'nao' },
  });

  const form2 = useForm<Passo2Form>({
    resolver: zodResolver(passo2Schema) as any,
  });

  const handleClose = () => {
    onOpenChange(false);
    setStep(1);
    setPasso1Data(null);
    form1.reset();
    form2.reset();
  };

  const onSubmitPasso1 = (data: Passo1Form) => {
    if (data.agendarRecontato === 'sim') {
      setPasso1Data(data);
      setStep(2);
    } else {
      handlePerder({ ...data, dataRecontato: undefined });
    }
  };

  const onSubmitPasso2 = (data: Passo2Form) => {
    if (!passo1Data) return;
    handlePerder({ ...passo1Data, dataRecontato: data.dataRecontato, observacaoRecontato: data.observacaoRecontato });
  };

  const handlePerder = async (data: {
    motivoPerda: string;
    detalhesPerda?: string;
    dataRecontato?: string;
    observacaoRecontato?: string;
  }) => {
    if (!oportunidade) return;
    try {
      await perderOportunidade.mutateAsync({
        id: oportunidade.id,
        data: {
          motivoPerda: data.motivoPerda,
          detalhesPerda: data.detalhesPerda || undefined,
          dataRecontato: data.dataRecontato || undefined,
          observacaoRecontato: data.observacaoRecontato || undefined,
        },
      });

      if (!data.dataRecontato) {
        await moverOportunidade.mutateAsync({ id: oportunidade.id, data: { novoStatus: 'arquivada', novaOrdem: 0 } });
        toast.success('Lead arquivado.');
      } else {
        const dataFormatada = dayjs(data.dataRecontato, 'YYYY-MM-DD').format('DD/MM/YYYY');
        toast.success(`Lead marcado como perdido. Recontato agendado para ${dataFormatada}.`);
      }
      handleClose();
    } catch (error) {
      toast.error(handleApiError(error));
    }
  };

  if (!oportunidade) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[600px] max-h-[88vh] gap-0 p-0 overflow-hidden">
        <div className="flex flex-col h-full max-h-[88vh]">
          {/* Cabeçalho */}
          <div className="flex items-center gap-3 border-b px-6 py-4 pr-14 shrink-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
              <XCircle className="h-4 w-4 text-destructive" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogHeader className="p-0 space-y-0">
                <DialogTitle className="text-base font-semibold">
                  {step === 1 ? 'Marcar como Perdido' : 'Agendar Recontato'}
                </DialogTitle>
                {oportunidade.nomeCliente && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{oportunidade.nomeCliente}</p>
                )}
              </DialogHeader>
            </div>
            {/* Indicador de passo */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className={cn('h-1.5 w-8 rounded-full transition-colors', step >= 1 ? 'bg-destructive' : 'bg-muted')} />
              <span className={cn('h-1.5 w-8 rounded-full transition-colors', step >= 2 ? 'bg-destructive' : 'bg-muted')} />
            </div>
          </div>

          {/* Conteúdo */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {step === 1 && (
              <Form {...form1}>
                <form id="perder-form-1" onSubmit={form1.handleSubmit(onSubmitPasso1)} className="space-y-6">
                  <FieldGroup label="Motivo da perda">
                    <FormField
                      control={form1.control}
                      name="motivoPerda"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-muted-foreground">Motivo <span className="text-destructive">*</span></FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Selecione o motivo" /></SelectTrigger></FormControl>
                            <SelectContent position="popper">
                              {MOTIVOS_PERDA.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form1.control}
                      name="detalhesPerda"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-muted-foreground">Detalhes <span className="text-muted-foreground/50">(opcional)</span></FormLabel>
                          <FormControl>
                            <Textarea placeholder="Descreva o que aconteceu..." className="resize-none" rows={3} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </FieldGroup>

                  <div className="border-t" />

                  <FieldGroup label="Próximos passos">
                    <FormField
                      control={form1.control}
                      name="agendarRecontato"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-muted-foreground">Agendar recontato futuro?</FormLabel>
                          <FormControl>
                            <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4 pt-1">
                              <div className="flex items-center gap-2">
                                <RadioGroupItem value="sim" id="recontato-sim" />
                                <Label htmlFor="recontato-sim" className="cursor-pointer">Sim</Label>
                              </div>
                              <div className="flex items-center gap-2">
                                <RadioGroupItem value="nao" id="recontato-nao" />
                                <Label htmlFor="recontato-nao" className="cursor-pointer">Não (arquivar)</Label>
                              </div>
                            </RadioGroup>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </FieldGroup>
                </form>
              </Form>
            )}

            {step === 2 && (
              <Form {...form2}>
                <form id="perder-form-2" onSubmit={form2.handleSubmit(onSubmitPasso2)} className="space-y-6">
                  <FieldGroup label="Agendar recontato">
                    <FormField
                      control={form2.control}
                      name="dataRecontato"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-muted-foreground">Data do recontato <span className="text-destructive">*</span></FormLabel>
                          <FormControl><DateInput value={field.value} onChange={field.onChange} showQuickSelect={false} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form2.control}
                      name="observacaoRecontato"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-muted-foreground">Por que tentar novamente? <span className="text-muted-foreground/50">(opcional)</span></FormLabel>
                          <FormControl>
                            <Textarea placeholder="O que mudou? Qual a estratégia?" className="resize-none" rows={3} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </FieldGroup>
                </form>
              </Form>
            )}
          </div>

          {/* Rodapé */}
          <div className="flex items-center justify-end gap-2 border-t px-6 py-4 shrink-0 bg-background/50">
            {step === 1 ? (
              <>
                <Button type="button" variant="ghost" size="sm" onClick={handleClose}>Cancelar</Button>
                <Button type="submit" form="perder-form-1" size="sm" variant="destructive" disabled={perderOportunidade.isPending}>
                  {form1.watch('agendarRecontato') === 'sim' ? 'Próximo →' : 'Confirmar perda'}
                </Button>
              </>
            ) : (
              <>
                <Button type="button" variant="ghost" size="sm" onClick={() => setStep(1)}>← Voltar</Button>
                <Button type="submit" form="perder-form-2" size="sm" variant="destructive" disabled={perderOportunidade.isPending}>
                  {perderOportunidade.isPending ? 'Salvando...' : 'Confirmar'}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
