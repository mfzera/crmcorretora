import { createFileRoute } from '@tanstack/react-router';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminGuard } from '@/modules/admin/components/admin-guard';
import { adminApi, type AdminSubscription, type SubscriptionInvoice } from '@/infra/http/admin-api';
import { Button } from '@/core/ui/button';
import { Input } from '@/core/ui/input';
import { Label } from '@/core/ui/label';
import { Badge } from '@/core/ui/badge';
import { Skeleton } from '@/core/ui/skeleton';
import { Textarea } from '@/core/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/core/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/core/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/core/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/core/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/core/ui/tabs';
import { toast } from 'sonner';
import {
  MoreHorizontal,
  Gift,
  FileText,
  Pause,
  Play,
  X,
  RotateCcw,
  Calendar,
  ExternalLink,
} from 'lucide-react';
import { PageHeader } from '@/modules/admin/components/page-header';

export const Route = createFileRoute('/_admin/admin/subscriptions')({
  component: AdminSubscriptionsPage,
});


// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBRL(value: string | number | null): string {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    Number(value),
  );
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('pt-BR');
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  ACTIVE: { label: 'Ativo', variant: 'default' },
  TRIAL: { label: 'Trial', variant: 'secondary' },
  PAST_DUE: { label: 'Inadimplente', variant: 'destructive' },
  CANCELLED: { label: 'Cancelado', variant: 'destructive' },
  UNPAID: { label: 'Não pago', variant: 'destructive' },
};

const CYCLE_LABEL: Record<string, string> = {
  TRIENAL: '3 anos',
  ANUAL: 'Anual',
  SEMESTRAL: 'Semestral',
  MENSAL: 'Mensal',
};

// ─── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, variant: 'outline' as const };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

// ─── Courtesy Seats Dialog ────────────────────────────────────────────────────

function CourtesySeatsDialog({
  subscription,
  open,
  onClose,
}: {
  subscription: AdminSubscription;
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [seats, setSeats] = useState(String(subscription.seatsCourtesy ?? 0));
  const [reason, setReason] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      adminApi.setCourtesySeats(subscription.corretoraId, {
        courtesySeats: Number(seats),
        reason: reason || undefined,
      }),
    onSuccess: () => {
      toast.success('Assentos de cortesia atualizados');
      queryClient.invalidateQueries({ queryKey: ['admin', 'subscriptions'] });
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const seatsUsed = subscription.seatsUsed ?? 0;
  const seatsIncluded = subscription.seatsIncluded ?? 3;
  const currentCourtesy = subscription.seatsCourtesy ?? 0;
  const newSeats = Number(seats) || 0;
  const billableUsers = Math.max(0, seatsUsed - newSeats);
  const seatsAdditional = Math.max(0, billableUsers - seatsIncluded);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Assentos de Cortesia
          </DialogTitle>
          <DialogDescription>{subscription.corretoraRazaoSocial}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3 text-sm rounded-md border p-3">
            <span className="text-muted-foreground">Usuários ativos</span>
            <span className="font-medium text-right">{seatsUsed}</span>
            <span className="text-muted-foreground">Assentos incluídos</span>
            <span className="font-medium text-right">{seatsIncluded}</span>
            <span className="text-muted-foreground">Cortesia atual</span>
            <span className="font-medium text-right">{currentCourtesy}</span>
            <span className="text-muted-foreground">Extras cobrados (novo)</span>
            <span className="font-medium text-right">{seatsAdditional}</span>
          </div>

          <div className="space-y-1.5">
            <Label>Nova quantidade de cortesia</Label>
            <Input
              type="number"
              min={0}
              value={seats}
              onChange={(e) => setSeats(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Motivo (opcional)</Label>
            <Textarea
              placeholder="Ex: usuário de suporte interno da EcoTech"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? 'Salvando…' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Invoices Sheet ───────────────────────────────────────────────────────────

function InvoicesSheet({
  subscription,
  open,
  onClose,
}: {
  subscription: AdminSubscription;
  open: boolean;
  onClose: () => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'subscriptions', subscription.corretoraId, 'invoices'],
    queryFn: () => adminApi.getSubscriptionInvoices(subscription.corretoraId),
    enabled: open,
  });

  const INVOICE_STATUS: Record<string, string> = {
    PAID: 'Pago',
    OPEN: 'Em aberto',
    DRAFT: 'Rascunho',
    VOID: 'Cancelado',
    UNCOLLECTIBLE: 'Inadimplente',
    CONFIRMED: 'Confirmado',
    RECEIVED: 'Recebido',
    PENDING: 'Pendente',
    OVERDUE: 'Vencido',
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-[600px] sm:max-w-[600px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Faturas
          </SheetTitle>
          <SheetDescription>{subscription.corretoraRazaoSocial}</SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : !data?.invoices.length ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma fatura encontrada</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Pago em</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>
                      <Badge variant={['PAID', 'CONFIRMED', 'RECEIVED'].includes(inv.status) ? 'default' : inv.status === 'OPEN' || inv.status === 'PENDING' ? 'secondary' : 'destructive'}>
                        {INVOICE_STATUS[inv.status] ?? inv.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatBRL(inv.total)}</TableCell>
                    <TableCell>{formatDate(inv.dueDate)}</TableCell>
                    <TableCell>{formatDate(inv.paidAt)}</TableCell>
                    <TableCell>
                      {inv.invoicePdfUrl && (
                        <a href={inv.invoicePdfUrl} target="_blank" rel="noreferrer">
                          <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                        </a>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Subscription Detail Sheet ─────────────────────────────────────────────────

function SubscriptionDetailSheet({
  subscription,
  open,
  onClose,
}: {
  subscription: AdminSubscription;
  open: boolean;
  onClose: () => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'subscriptions', subscription.corretoraId, 'detail'],
    queryFn: () => adminApi.getSubscription(subscription.corretoraId),
    enabled: open,
  });

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-[560px] sm:max-w-[560px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Detalhes da Assinatura</SheetTitle>
          <SheetDescription>{subscription.corretoraRazaoSocial}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6 text-sm">
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-8" />)}
            </div>
          ) : (
            <>
              <section className="space-y-2">
                <h3 className="font-semibold text-base">Assinatura local</h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-md border p-3">
                  <span className="text-muted-foreground">Status</span>
                  <span><StatusBadge status={subscription.status} /></span>
                  <span className="text-muted-foreground">Plano</span>
                  <span>{subscription.planoNome}</span>
                  <span className="text-muted-foreground">Ciclo</span>
                  <span>{CYCLE_LABEL[subscription.planCycle] ?? subscription.planCycle}</span>
                  <span className="text-muted-foreground">Receita mensal</span>
                  <span className="font-medium">{formatBRL(subscription.totalMonthly)}</span>
                  <span className="text-muted-foreground">Seats (usados / incluídos / cortesia)</span>
                  <span>{subscription.seatsUsed ?? 0} / {subscription.seatsIncluded ?? 3} / {subscription.seatsCourtesy ?? 0}</span>
                  <span className="text-muted-foreground">Período atual</span>
                  <span>{formatDate(subscription.currentPeriodStart)} → {formatDate(subscription.currentPeriodEnd)}</span>
                  <span className="text-muted-foreground">Trial</span>
                  <span>{subscription.trialStart ? `${formatDate(subscription.trialStart)} → ${formatDate(subscription.trialEnd)}` : '—'}</span>
                  <span className="text-muted-foreground">Cancela no período</span>
                  <span>{subscription.cancelAtPeriodEnd ? 'Sim' : 'Não'}</span>
                </div>
              </section>

              {data?.asaasCustomer && (
                <section className="space-y-2">
                  <h3 className="font-semibold text-base">Cliente Asaas</h3>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-md border p-3">
                    <span className="text-muted-foreground">ID</span>
                    <span className="font-mono text-xs">{subscription.asaasCustomerId}</span>
                    <span className="text-muted-foreground">Nome</span>
                    <span>{(data.asaasCustomer as any).name}</span>
                    <span className="text-muted-foreground">Email</span>
                    <span>{(data.asaasCustomer as any).email}</span>
                    <span className="text-muted-foreground">CPF/CNPJ</span>
                    <span>{(data.asaasCustomer as any).cpfCnpj}</span>
                  </div>
                </section>
              )}

              {data?.asaasSubscription && (
                <section className="space-y-2">
                  <h3 className="font-semibold text-base">Assinatura Asaas</h3>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-md border p-3">
                    <span className="text-muted-foreground">ID</span>
                    <span className="font-mono text-xs">{subscription.asaasSubscriptionId}</span>
                    <span className="text-muted-foreground">Status</span>
                    <span>{(data.asaasSubscription as any).status}</span>
                    <span className="text-muted-foreground">Valor</span>
                    <span>{formatBRL((data.asaasSubscription as any).value)}</span>
                    <span className="text-muted-foreground">Ciclo</span>
                    <span>{(data.asaasSubscription as any).cycle ?? '—'}</span>
                    <span className="text-muted-foreground">Próximo vencimento</span>
                    <span>{formatDate((data.asaasSubscription as any).nextDueDate)}</span>
                  </div>
                </section>
              )}

              <section className="space-y-2">
                <h3 className="font-semibold text-base">Identificadores Asaas</h3>
                <div className="space-y-1 rounded-md border p-3 font-mono text-xs text-muted-foreground break-all">
                  <p>Customer: {subscription.asaasCustomerId ?? '—'}</p>
                  <p>Subscription: {subscription.asaasSubscriptionId ?? '—'}</p>
                  <p>Payment: {subscription.asaasPaymentId ?? '—'}</p>
                </div>
              </section>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Extend Trial Dialog ───────────────────────────────────────────────────────

function ExtendTrialDialog({
  subscription,
  open,
  onClose,
}: {
  subscription: AdminSubscription;
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [date, setDate] = useState('');

  const mutation = useMutation({
    mutationFn: () => adminApi.extendSubscriptionTrial(subscription.corretoraId, { trialEndDate: date }),
    onSuccess: () => {
      toast.success('Trial estendido');
      queryClient.invalidateQueries({ queryKey: ['admin', 'subscriptions'] });
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Estender Trial
          </DialogTitle>
          <DialogDescription>{subscription.corretoraRazaoSocial}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label>Nova data de fim do trial</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => mutation.mutate()} disabled={!date || mutation.isPending}>
            {mutation.isPending ? 'Salvando…' : 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Override Plan Dialog ──────────────────────────────────────────────────────

function OverridePlanDialog({
  subscription,
  open,
  onClose,
}: {
  subscription: AdminSubscription;
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [cycle, setCycle] = useState(subscription.planCycle);
  const [value, setValue] = useState('');
  const [reason, setReason] = useState('');

  const isTrienal = subscription.planCycle === 'TRIENAL';

  const mutation = useMutation({
    mutationFn: () =>
      adminApi.overrideSubscriptionPlan(subscription.corretoraId, {
        planCycle: cycle || undefined,
        newValue: value ? Number(value) : undefined,
        reason: reason || undefined,
      }),
    onSuccess: () => {
      toast.success('Plano atualizado');
      queryClient.invalidateQueries({ queryKey: ['admin', 'subscriptions'] });
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            Override de Plano
          </DialogTitle>
          <DialogDescription>{subscription.corretoraRazaoSocial}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {isTrienal && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              Atenção: assinaturas TRIENAIS usam pagamento avulso no Asaas. Alterar o ciclo não modifica o pagamento já criado automaticamente.
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Ciclo de cobrança</Label>
            <select
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={cycle}
              onChange={(e) => setCycle(e.target.value)}
            >
              <option value="TRIENAL">3 Anos (Trienal)</option>
              <option value="ANUAL">Anual</option>
              <option value="SEMESTRAL">Semestral</option>
              <option value="MENSAL">Mensal</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label>Valor personalizado (opcional, em BRL/mês)</Label>
            <Input
              type="number"
              min={0}
              step={0.01}
              placeholder="Deixar vazio para calcular automaticamente"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Motivo</Label>
            <Textarea
              placeholder="Ex: desconto comercial negociado"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? 'Salvando…' : 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Actions Row ──────────────────────────────────────────────────────────────

type DialogType = 'detail' | 'courtesy' | 'invoices' | 'trial' | 'override' | null;

function SubscriptionActions({ sub }: { sub: AdminSubscription }) {
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState<DialogType>(null);

  const pauseMutation = useMutation({
    mutationFn: () => adminApi.pauseSubscription(sub.corretoraId),
    onSuccess: () => {
      toast.success('Assinatura pausada (cancela no fim do período)');
      queryClient.invalidateQueries({ queryKey: ['admin', 'subscriptions'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const resumeMutation = useMutation({
    mutationFn: () => adminApi.resumeSubscriptionAdmin(sub.corretoraId),
    onSuccess: () => {
      toast.success('Assinatura reativada');
      queryClient.invalidateQueries({ queryKey: ['admin', 'subscriptions'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const cancelMutation = useMutation({
    mutationFn: () => adminApi.cancelSubscriptionAdmin(sub.corretoraId, { immediately: true }),
    onSuccess: () => {
      toast.success('Assinatura cancelada');
      queryClient.invalidateQueries({ queryKey: ['admin', 'subscriptions'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Ações</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setDialog('detail')}>Ver detalhes</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setDialog('invoices')}>
            <FileText className="mr-2 h-4 w-4" />
            Faturas
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setDialog('courtesy')}>
            <Gift className="mr-2 h-4 w-4" />
            Assentos de cortesia
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setDialog('override')}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Override de plano
          </DropdownMenuItem>
          {(sub.status === 'TRIAL' || sub.trialEnd) && (
            <DropdownMenuItem onClick={() => setDialog('trial')}>
              <Calendar className="mr-2 h-4 w-4" />
              Estender trial
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          {sub.cancelAtPeriodEnd ? (
            <DropdownMenuItem onClick={() => resumeMutation.mutate()}>
              <Play className="mr-2 h-4 w-4" />
              Reativar
            </DropdownMenuItem>
          ) : sub.status !== 'CANCELLED' ? (
            <DropdownMenuItem onClick={() => pauseMutation.mutate()}>
              <Pause className="mr-2 h-4 w-4" />
              Pausar (fim do período)
            </DropdownMenuItem>
          ) : null}
          {sub.status !== 'CANCELLED' && (
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => {
                if (confirm(`Cancelar assinatura de ${sub.corretoraRazaoSocial} imediatamente?`)) {
                  cancelMutation.mutate();
                }
              }}
            >
              <X className="mr-2 h-4 w-4" />
              Cancelar agora
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {dialog === 'detail' && (
        <SubscriptionDetailSheet subscription={sub} open onClose={() => setDialog(null)} />
      )}
      {dialog === 'courtesy' && (
        <CourtesySeatsDialog subscription={sub} open onClose={() => setDialog(null)} />
      )}
      {dialog === 'invoices' && (
        <InvoicesSheet subscription={sub} open onClose={() => setDialog(null)} />
      )}
      {dialog === 'trial' && (
        <ExtendTrialDialog subscription={sub} open onClose={() => setDialog(null)} />
      )}
      {dialog === 'override' && (
        <OverridePlanDialog subscription={sub} open onClose={() => setDialog(null)} />
      )}
    </>
  );
}

// ─── Infra cost calculation (mesma lógica do cost-overview-panel) ─────────────

const R2_PRICING = {
  storage: { pricePerGB: 0.015, freeTierGB: 10 },
  classA:  { pricePerMillion: 4.5,  freeTierMillion: 1  },
  classB:  { pricePerMillion: 0.36, freeTierMillion: 10 },
};
const NEON_PRICING = {
  compute:  { pricePerCUHour: 0.106, freeTierHours: 5 },
  storage:  { pricePerGBMonth: 0.35, freeTierGB: 10   },
  transfer: { pricePerGB: 0.09,      freeTierGB: 5    },
};
const RAILWAY_PRICING = {
  cpu:     { perMinute: 0.000463 },
  memory:  { perMinute: 0.000231 },
  network: { perGB: 0.10 },
};
const PLAN_FREE_STORAGE: Record<string, number> = {
  free: 0.5, launch_v3: 10, scale_v3: 50, business: 500,
};

function calcR2Cost(storageBytes: number, writes: number, reads: number) {
  const storageGB = storageBytes / 1024 ** 3;
  const billableStorageGB = Math.max(0, storageGB - R2_PRICING.storage.freeTierGB);
  const billableWritesM   = Math.max(0, writes / 1e6 - R2_PRICING.classA.freeTierMillion);
  const billableReadsM    = Math.max(0, reads  / 1e6 - R2_PRICING.classB.freeTierMillion);
  return billableStorageGB * R2_PRICING.storage.pricePerGB
       + billableWritesM   * R2_PRICING.classA.pricePerMillion
       + billableReadsM    * R2_PRICING.classB.pricePerMillion;
}

function calcNeonCost(computeH: number, storageGBMonth: number, transferGB: number, subType?: string) {
  const freeStorage = PLAN_FREE_STORAGE[subType ?? ''] ?? NEON_PRICING.storage.freeTierGB;
  return Math.max(0, computeH    - NEON_PRICING.compute.freeTierHours) * NEON_PRICING.compute.pricePerCUHour
       + Math.max(0, storageGBMonth - freeStorage)                     * NEON_PRICING.storage.pricePerGBMonth
       + Math.max(0, transferGB  - NEON_PRICING.transfer.freeTierGB)   * NEON_PRICING.transfer.pricePerGB;
}

function calcRailwayCost(cpuMin: number, memGBMin: number, networkTxGB: number) {
  return cpuMin * RAILWAY_PRICING.cpu.perMinute
       + memGBMin * RAILWAY_PRICING.memory.perMinute
       + networkTxGB * RAILWAY_PRICING.network.perGB;
}

function getRange30d() {
  const now  = new Date();
  const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const fmt  = (d: Date) => d.toISOString().split('T')[0];
  return { dateFrom: fmt(from), dateTo: fmt(now) };
}

function useInfraCost() {
  const { dateFrom, dateTo } = useMemo(() => getRange30d(), []);

  const { data: r2Buckets } = useQuery({
    queryKey: ['admin', 'r2', 'buckets'],
    queryFn:  () => adminApi.getR2Buckets(),
    staleTime: 5 * 60 * 1000,
  });
  const firstBucket = r2Buckets?.buckets?.[0]?.name;

  const { data: r2Metrics, isLoading: loadingR2Metrics } = useQuery({
    queryKey: ['admin', 'r2', 'metrics', firstBucket, dateFrom, dateTo],
    queryFn:  () => adminApi.getR2BucketMetrics(firstBucket!, dateFrom, dateTo),
    enabled:  !!firstBucket,
    staleTime: 5 * 60 * 1000,
  });

  const { data: r2Ops, isLoading: loadingR2Ops } = useQuery({
    queryKey: ['admin', 'r2', 'ops', firstBucket, dateFrom, dateTo],
    queryFn:  () => adminApi.getR2Operations({ bucketName: firstBucket, dateFrom, dateTo }),
    enabled:  !!firstBucket,
    staleTime: 5 * 60 * 1000,
  });

  const { data: neonData, isLoading: loadingNeon } = useQuery({
    queryKey: ['admin', 'neon', 'consumption'],
    queryFn:  () => adminApi.getNeonConsumption(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: railwayUsage, isLoading: loadingRailway } = useQuery({
    queryKey: ['admin', 'railway', 'usage'],
    queryFn:  () => adminApi.getRailwayUsage(),
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = loadingR2Metrics || loadingR2Ops || loadingNeon || loadingRailway;

  const totalUSD = useMemo(() => {
    const r2StorageBytes = (r2Metrics?.storage?.payloadSize ?? 0) + (r2Metrics?.storage?.metadataSize ?? 0);
    const r2Writes = r2Ops?.data?.filter((g) => g.dimensions.actionType === 'writeObject').reduce((a, g) => a + g.sum.requests, 0) ?? 0;
    const r2Reads  = r2Ops?.data?.filter((g) => g.dimensions.actionType === 'readObject' ).reduce((a, g) => a + g.sum.requests, 0) ?? 0;
    const r2Cost   = calcR2Cost(r2StorageBytes, r2Writes, r2Reads);

    const neonSub         = neonData?.data?.[0]?.subscription_type;
    const neonComputeH    = (neonData?.data ?? []).reduce((acc, p) => acc + p.periods.reduce((a, per) => a + per.compute_unit_seconds / 3600, 0), 0);
    const neonStorageGBMo = (neonData?.data ?? []).reduce((acc, p) => acc + p.periods.reduce((a, per) => a + per.data_storage_bytes_hour / 730 / 1e9, 0), 0);
    const neonTransferGB  = (neonData?.data ?? []).reduce((acc, p) => acc + p.periods.reduce((a, per) => a + per.data_transfer_bytes / 1e9, 0), 0);
    const neonCost        = calcNeonCost(neonComputeH, neonStorageGBMo, neonTransferGB, neonSub);

    const ru = railwayUsage?.estimated ?? railwayUsage?.actual;
    const railwayCost = ru ? calcRailwayCost(ru.cpuMinutes ?? 0, ru.memoryGBMinutes ?? 0, ru.networkTxGB ?? 0) : 0;

    return { r2: r2Cost, neon: neonCost, railway: railwayCost, total: r2Cost + neonCost + railwayCost };
  }, [r2Metrics, r2Ops, neonData, railwayUsage]);

  return { totalUSD, isLoading };
}

// ─── Cost vs Revenue Tab ───────────────────────────────────────────────────────

function CostRevenueTab({ subscriptions }: { subscriptions: AdminSubscription[] }) {
  const [exchangeRate, setExchangeRate] = useState('5.8');
  const { totalUSD, isLoading: loadingCost } = useInfraCost();

  const totalSeatsUsed = subscriptions.reduce((sum, s) => sum + (s.seatsUsed ?? 0), 0);
  const rate = Number(exchangeRate) || 5.8;
  const infraUSD = totalUSD.total;

  const totalRevenueBRL = subscriptions.reduce((sum, s) => sum + Number(s.totalMonthly ?? 0), 0);
  const totalCostBRL = infraUSD * rate;
  const totalMargin = totalRevenueBRL - totalCostBRL;

  return (
    <div className="space-y-6">
      <div className="rounded-md border p-4 space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h3 className="font-semibold">Custo de infraestrutura (automático)</h3>
            <p className="text-sm text-muted-foreground">
              Calculado em tempo real via Railway + Neon + R2 — últimos 30 dias
            </p>
          </div>
          <div className="flex items-center gap-3">
            {loadingCost ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Total infra/mês</div>
                <div className="font-bold text-lg">
                  ${infraUSD.toFixed(2)} <span className="text-sm font-normal text-muted-foreground">USD</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  R2: ${totalUSD.r2.toFixed(2)} · Neon: ${totalUSD.neon.toFixed(2)} · Railway: ${totalUSD.railway.toFixed(2)}
                </div>
              </div>
            )}
            <div className="space-y-1">
              <Label className="text-xs">Câmbio BRL/USD</Label>
              <Input
                type="number"
                min={1}
                step={0.01}
                className="w-24 h-8 text-sm"
                value={exchangeRate}
                onChange={(e) => setExchangeRate(e.target.value)}
              />
            </div>
          </div>
        </div>

        {!loadingCost && (
          <div className="grid grid-cols-3 gap-3 pt-2 border-t">
            <div className="text-center">
              <div className="text-xs text-muted-foreground">Receita total</div>
              <div className="font-bold text-emerald-600">{formatBRL(totalRevenueBRL)}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground">Custo infra</div>
              <div className="font-bold text-amber-600">{formatBRL(totalCostBRL)}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground">Margem total</div>
              <div className={`font-bold ${totalMargin >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                {formatBRL(totalMargin)}
                {totalRevenueBRL > 0 && (
                  <span className="text-xs font-normal ml-1">
                    ({((totalMargin / totalRevenueBRL) * 100).toFixed(1)}%)
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Corretora</TableHead>
              <TableHead className="text-right">Seats</TableHead>
              <TableHead className="text-right">Receita/mês</TableHead>
              <TableHead className="text-right">Custo infra</TableHead>
              <TableHead className="text-right">Margem</TableHead>
              <TableHead className="text-right">%</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subscriptions.map((sub) => {
              const revenue = Number(sub.totalMonthly ?? 0);
              const seats = sub.seatsUsed ?? 0;
              const share = totalSeatsUsed > 0 ? seats / totalSeatsUsed : 0;
              const costBRL = infraUSD * rate * share;
              const margin = revenue - costBRL;
              const marginPct = revenue > 0 ? (margin / revenue) * 100 : 0;

              return (
                <TableRow key={sub.id}>
                  <TableCell>
                    <div className="font-medium">{sub.corretoraRazaoSocial}</div>
                    <div className="text-xs text-muted-foreground">{sub.corretoraCnpj ?? '—'}</div>
                  </TableCell>
                  <TableCell className="text-right">{seats}</TableCell>
                  <TableCell className="text-right">{formatBRL(revenue)}</TableCell>
                  <TableCell className="text-right">
                    {loadingCost
                      ? <Skeleton className="h-4 w-16 ml-auto" />
                      : formatBRL(costBRL)}
                  </TableCell>
                  <TableCell className={`text-right font-medium ${!loadingCost ? (margin < 0 ? 'text-destructive' : margin / (revenue || 1) < 0.2 ? 'text-amber-600' : 'text-emerald-600') : ''}`}>
                    {loadingCost ? <Skeleton className="h-4 w-16 ml-auto" /> : formatBRL(margin)}
                  </TableCell>
                  <TableCell className={`text-right ${!loadingCost ? (marginPct < 0 ? 'text-destructive' : marginPct < 20 ? 'text-amber-600' : 'text-emerald-600') : ''}`}>
                    {loadingCost ? <Skeleton className="h-4 w-10 ml-auto" /> : `${marginPct.toFixed(1)}%`}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        * Custo por corretora estimado proporcionalmente aos usuários ativos. Câmbio: {rate} BRL/USD.
      </p>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

function AdminSubscriptionsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'subscriptions'],
    queryFn: () => adminApi.getSubscriptions(),
  });

  const subscriptions = data?.subscriptions ?? [];

  return (
    <AdminGuard requiredPermission="manage_tenants">
      <div className="space-y-10">
        <PageHeader
          eyebrow="Receita e assinaturas"
          title="Faturamento"
          description="Gerencie assinaturas, cortesias e visualize custo vs receita por corretora."
        />

        <Tabs defaultValue="subscriptions">
          <TabsList>
            <TabsTrigger value="subscriptions">Assinaturas</TabsTrigger>
            <TabsTrigger value="cost-revenue">Custo vs Receita</TabsTrigger>
          </TabsList>

          <TabsContent value="subscriptions" className="mt-4">
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14" />)}
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Corretora</TableHead>
                      <TableHead>Plano / Ciclo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Seats</TableHead>
                      <TableHead className="text-right">Receita/mês</TableHead>
                      <TableHead>Período</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscriptions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          Nenhuma assinatura encontrada
                        </TableCell>
                      </TableRow>
                    ) : (
                      subscriptions.map((sub) => (
                        <TableRow key={sub.id}>
                          <TableCell>
                            <div className="font-medium">{sub.corretoraRazaoSocial}</div>
                            <div className="text-xs text-muted-foreground">{sub.corretoraCnpj ?? '—'}</div>
                          </TableCell>
                          <TableCell>
                            <div>{sub.planoNome}</div>
                            <div className="text-xs text-muted-foreground">{CYCLE_LABEL[sub.planCycle] ?? sub.planCycle}</div>
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={sub.status} />
                            {sub.cancelAtPeriodEnd && (
                              <span className="block text-xs text-amber-600 mt-0.5">cancela no período</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <span title={`${sub.seatsUsed ?? 0} usados / ${sub.seatsIncluded ?? 3} incluídos / ${sub.seatsCourtesy ?? 0} cortesia`}>
                              {sub.seatsUsed ?? 0}/{sub.seatsIncluded ?? 3}
                              {(sub.seatsCourtesy ?? 0) > 0 && (
                                <span className="text-xs text-muted-foreground ml-1">+{sub.seatsCourtesy}🎁</span>
                              )}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatBRL(sub.totalMonthly)}
                          </TableCell>
                          <TableCell>
                            <div className="text-xs text-muted-foreground">
                              {formatDate(sub.currentPeriodStart)} →<br />
                              {formatDate(sub.currentPeriodEnd)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <SubscriptionActions sub={sub} />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="cost-revenue" className="mt-4">
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14" />)}
              </div>
            ) : (
              <CostRevenueTab subscriptions={subscriptions} />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AdminGuard>
  );
}
