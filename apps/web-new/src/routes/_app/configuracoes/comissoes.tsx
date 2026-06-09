import { createFileRoute } from '@tanstack/react-router';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/core/ui/card';
import { Button } from '@/core/ui/button';
import { Input } from '@/core/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/core/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/core/ui/alert-dialog';
import { Badge } from '@/core/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/core/ui/tabs';
import { Skeleton } from '@/core/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/core/ui/select';
import { PageGuard } from '@/modules/auth/components/page-guard';
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Percent,
  ArrowRight,
  Globe,
  Briefcase,
  User,
  Info,
  PackageOpen,
  BarChart3,
  History,
  Receipt,
  Users,
  ListChecks,
  CalendarDays,
} from 'lucide-react';
import {
  useConfigsGlobais,
  useConfigsVendedores,
  useConfigsCargos,
  useUpsertConfigGlobal,
  useDeleteConfigGlobal,
  useDeleteConfigVendedor,
  useDeleteConfigCargo,
  type CorretoraComissaoConfig,
  type TipoNegocio,
} from '@/modules/configuracoes-comissoes/http';
import { AdicionarConfigVendedorDialog } from '@/modules/configuracoes-comissoes/components/adicionar-config-vendedor-dialog';
import { AdicionarConfigCargoDialog } from '@/modules/configuracoes-comissoes/components/adicionar-config-cargo-dialog';
import { TipoSeguroSelect } from '@/modules/configuracoes-comissoes/components/tipo-seguro-select';
import { ConfigLoteDialog } from '@/modules/configuracoes-comissoes/components/config-lote-dialog';
import { ExtratoComissoes } from '@/modules/configuracoes-comissoes/components/extrato-comissoes';
import { RelatorioComissoes } from '@/modules/configuracoes-comissoes/components/relatorio-comissoes';
import { HistoricoConfigs } from '@/modules/configuracoes-comissoes/components/historico-configs';
import { LancamentosComissao, ProjecaoLancamentos } from '@/modules/configuracoes-comissoes/components/lancamentos-comissao';
import { cn } from '@/core/utils';

export const Route = createFileRoute('/_app/configuracoes/comissoes')({
  component: ConfiguracoesComissoesPage,
});


// ─── Helpers ────────────────────────────────────────────────────────────────

function TipoNegocioBadge({ value }: { value: TipoNegocio }) {
  if (value === 'NOVO')
    return (
      <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 hover:bg-blue-500/10 font-normal">
        Novo
      </Badge>
    );
  if (value === 'RENOVACAO')
    return (
      <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/10 font-normal">
        Renovação
      </Badge>
    );
  return (
    <Badge variant="secondary" className="font-normal text-muted-foreground">
      Ambos
    </Badge>
  );
}

function PercentualCell({ value }: { value: string }) {
  const n = parseFloat(value);
  return (
    <span className="font-semibold tabular-nums">
      {n.toFixed(2)}
      <span className="text-muted-foreground font-normal text-xs ml-0.5">%</span>
    </span>
  );
}

function TableSkeleton({ cols }: { cols: number }) {
  return (
    <>
      {[1, 2, 3].map((i) => (
        <TableRow key={i}>
          {Array.from({ length: cols }).map((_, j) => (
            <TableCell key={j}>
              <Skeleton className="h-4 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <TableRow>
      <TableCell colSpan={99}>
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <PackageOpen className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </TableCell>
    </TableRow>
  );
}

// ─── Editable row (global) ───────────────────────────────────────────────────

function EditableRow({
  config,
  onSave,
  onDelete,
  isSaving,
}: {
  config: CorretoraComissaoConfig;
  onSave: (tipoSeguro: string, tipoNegocio: TipoNegocio, percentual: number) => void;
  onDelete: (id: string) => void;
  isSaving: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(config.percentualParticipacao);

  return (
    <TableRow className={cn(editing && 'bg-muted/30')}>
      <TableCell>
        <Badge variant="outline" className="font-normal">
          {config.tipoSeguro}
        </Badge>
      </TableCell>
      <TableCell>
        <TipoNegocioBadge value={config.tipoNegocio} />
      </TableCell>
      <TableCell>
        {editing ? (
          <div className="flex items-center gap-1.5">
            <div className="relative w-[100px]">
              <Input
                type="number"
                min={0}
                max={100}
                step={0.01}
                value={value}
                onChange={(e) => setValue(e.target.value as any)}
                className="pr-6 h-8 text-sm"
                autoFocus
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
                %
              </span>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
              disabled={isSaving}
              onClick={() => {
                onSave(config.tipoSeguro, config.tipoNegocio, parseFloat(String(value)));
                setEditing(false);
              }}
            >
              {isSaving ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Check className="h-3 w-3" />
              )}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => {
                setValue(config.percentualParticipacao);
                setEditing(false);
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <PercentualCell value={config.percentualParticipacao} />
        )}
      </TableCell>
      <TableCell className="text-right">
        {!editing && (
          <div className="flex items-center justify-end gap-0.5">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-muted-foreground"
              onClick={() => setEditing(true)}
            >
              <Pencil className="h-3 w-3" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remover configuração?</AlertDialogTitle>
                  <AlertDialogDescription>
                    A configuração de comissão para{' '}
                    <strong>{config.tipoSeguro}</strong> (
                    {config.tipoNegocio === 'NOVO'
                      ? 'Novo'
                      : config.tipoNegocio === 'RENOVACAO'
                        ? 'Renovação'
                        : 'Ambos'}
                    ) será removida. Cotações já criadas não serão afetadas.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive hover:bg-destructive/90"
                    onClick={() => onDelete(config.id)}
                  >
                    Remover
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}

// ─── Inline add form (global) ────────────────────────────────────────────────

function AdicionarGlobalForm({
  onAdd,
}: {
  onAdd: (tipoSeguro: string, tipoNegocio: TipoNegocio, percentual: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [tipoSeguro, setTipoSeguro] = useState('');
  const [tipoNegocio, setTipoNegocio] = useState<TipoNegocio>(null);
  const [percentual, setPercentual] = useState('');

  const handleAdd = () => {
    if (!tipoSeguro || !percentual) return;
    onAdd(tipoSeguro, tipoNegocio, parseFloat(percentual));
    setTipoSeguro('');
    setTipoNegocio(null);
    setPercentual('');
    setOpen(false);
  };

  if (!open) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground hover:text-foreground w-full justify-start gap-1.5 border border-dashed mt-1"
        onClick={() => setOpen(true)}
      >
        <Plus className="h-3.5 w-3.5" />
        Nova regra
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2 p-3 rounded-lg border border-dashed bg-muted/20 mt-1 flex-wrap">
      <div className="w-[175px]">
        <TipoSeguroSelect value={tipoSeguro} onChange={setTipoSeguro} placeholder="Tipo de seguro" />
      </div>
      <div className="w-[165px]">
        <Select
          value={tipoNegocio ?? '__ambos'}
          onValueChange={(v) => setTipoNegocio(v === '__ambos' ? null : (v as TipoNegocio))}
        >
          <SelectTrigger className="h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__ambos">Ambos</SelectItem>
            <SelectItem value="NOVO">Novo</SelectItem>
            <SelectItem value="RENOVACAO">Renovação</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="relative w-[100px]">
        <Input
          type="number"
          min={0}
          max={100}
          step={0.01}
          placeholder="10"
          value={percentual}
          onChange={(e) => setPercentual(e.target.value)}
          className="pr-6 h-9 text-sm"
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
          %
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <Button
          size="sm"
          onClick={handleAdd}
          disabled={!tipoSeguro || !percentual}
          className="h-9"
        >
          <Check className="h-3.5 w-3.5 mr-1" />
          Salvar
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-9"
          onClick={() => {
            setOpen(false);
            setTipoSeguro('');
            setTipoNegocio(null);
            setPercentual('');
          }}
        >
          Cancelar
        </Button>
      </div>
    </div>
  );
}

// ─── Delete confirmation row ──────────────────────────────────────────────────

function DeleteRowButton({
  onDelete,
  label,
}: {
  onDelete: () => void;
  label: string;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remover configuração?</AlertDialogTitle>
          <AlertDialogDescription>{label}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive hover:bg-destructive/90"
            onClick={onDelete}
          >
            Remover
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

function ConfiguracoesComissoesPage() {
  const [dialogVendedorOpen, setDialogVendedorOpen] = useState(false);
  const [dialogCargoOpen, setDialogCargoOpen] = useState(false);
  const [dialogLoteOpen, setDialogLoteOpen] = useState(false);

  const { data: configsGlobais = [], isLoading: loadingGlobal } = useConfigsGlobais();
  const { data: configsVendedores = [], isLoading: loadingVendedores } = useConfigsVendedores();
  const { data: configsCargos = [], isLoading: loadingCargos } = useConfigsCargos();

  const upsertGlobal = useUpsertConfigGlobal();
  const deleteGlobal = useDeleteConfigGlobal();
  const deleteVendedor = useDeleteConfigVendedor();
  const deleteCargo = useDeleteConfigCargo();

  return (
    <PageGuard permission="configuracoes:gerenciar_comissoes">
      <div className="container max-w-5xl px-4 sm:px-6 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary mt-0.5">
            <Percent className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Comissões</h1>
            <p className="text-muted-foreground mt-0.5 text-sm">
              Configure percentuais, acompanhe o extrato e analise o relatório de comissões.
            </p>
          </div>
        </div>

        {/* Priority callout */}
        <div className="flex items-start gap-3 rounded-lg border bg-muted/30 px-4 py-3">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <div className="flex flex-col gap-1 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Como a hierarquia funciona</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="flex items-center gap-1 rounded-md bg-background border px-2 py-0.5 text-xs font-medium">
                <Globe className="h-3 w-3" /> Global
              </span>
              <ArrowRight className="h-3 w-3" />
              <span className="flex items-center gap-1 rounded-md bg-background border px-2 py-0.5 text-xs font-medium">
                <Briefcase className="h-3 w-3" /> Por Cargo
              </span>
              <ArrowRight className="h-3 w-3" />
              <span className="flex items-center gap-1 rounded-md bg-background border px-2 py-0.5 text-xs font-medium">
                <User className="h-3 w-3" /> Por Vendedor
              </span>
              <span className="hidden sm:inline">— a regra mais específica sempre prevalece.</span>
            </div>
          </div>
        </div>

        {/* Tabs principais */}
        <Tabs defaultValue="configuracoes" className="space-y-4">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="configuracoes" className="gap-1.5 text-xs sm:text-sm">
              <Percent className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Configurações</span>
              <span className="sm:hidden">Config.</span>
            </TabsTrigger>
            <TabsTrigger value="lancamentos" className="gap-1.5 text-xs sm:text-sm">
              <ListChecks className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Lançamentos</span>
              <span className="sm:hidden">Lanç.</span>
            </TabsTrigger>
            <TabsTrigger value="projecao" className="gap-1.5 text-xs sm:text-sm">
              <CalendarDays className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Projeção</span>
              <span className="sm:hidden">Proj.</span>
            </TabsTrigger>
            <TabsTrigger value="extrato" className="gap-1.5 text-xs sm:text-sm">
              <Receipt className="h-3.5 w-3.5" />
              Extrato
            </TabsTrigger>
            <TabsTrigger value="relatorio" className="gap-1.5 text-xs sm:text-sm">
              <BarChart3 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Relatório</span>
              <span className="sm:hidden">Rel.</span>
            </TabsTrigger>
            <TabsTrigger value="historico" className="gap-1.5 text-xs sm:text-sm">
              <History className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Histórico</span>
              <span className="sm:hidden">Hist.</span>
            </TabsTrigger>
          </TabsList>

          {/* ── Configurações ── */}
          <TabsContent value="configuracoes" className="space-y-4">
            <Tabs defaultValue="global" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="global" className="gap-1.5">
                  <Globe className="h-3.5 w-3.5" />
                  Global
                  {configsGlobais.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-[10px]">
                      {configsGlobais.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="cargos" className="gap-1.5">
                  <Briefcase className="h-3.5 w-3.5" />
                  Por Cargo
                  {configsCargos.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-[10px]">
                      {configsCargos.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="vendedores" className="gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  Por Vendedor
                  {configsVendedores.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-[10px]">
                      {configsVendedores.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* ── Global ── */}
              <TabsContent value="global">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Padrão Global</CardTitle>
                    <CardDescription>
                      Aplica-se a todos os vendedores sem configuração específica de cargo ou individual.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead>Tipo de seguro</TableHead>
                          <TableHead>Tipo de negócio</TableHead>
                          <TableHead>Participação</TableHead>
                          <TableHead className="w-[80px]" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loadingGlobal ? (
                          <TableSkeleton cols={4} />
                        ) : configsGlobais.length === 0 ? (
                          <EmptyState label="Nenhuma regra global cadastrada." />
                        ) : (
                          configsGlobais.map((config) => (
                            <EditableRow
                              key={config.id}
                              config={config}
                              onSave={(tipoSeguro, tipoNegocio, percentual) =>
                                upsertGlobal.mutate({
                                  tipoSeguro,
                                  tipoNegocio,
                                  percentualParticipacao: percentual,
                                })
                              }
                              onDelete={(id) => deleteGlobal.mutate(id)}
                              isSaving={upsertGlobal.isPending}
                            />
                          ))
                        )}
                      </TableBody>
                    </Table>
                    {!loadingGlobal && (
                      <AdicionarGlobalForm
                        onAdd={(tipoSeguro, tipoNegocio, percentual) =>
                          upsertGlobal.mutate({
                            tipoSeguro,
                            tipoNegocio,
                            percentualParticipacao: percentual,
                          })
                        }
                      />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── Por Cargo ── */}
              <TabsContent value="cargos">
                <Card>
                  <CardHeader className="flex flex-row items-start justify-between pb-3">
                    <div className="space-y-1">
                      <CardTitle className="text-base">Por Cargo</CardTitle>
                      <CardDescription>
                        Sobrescreve o padrão global para todos os vendedores com o cargo selecionado.
                      </CardDescription>
                    </div>
                    <Button size="sm" onClick={() => setDialogCargoOpen(true)} className="shrink-0">
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Adicionar
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead>Cargo</TableHead>
                          <TableHead>Tipo de seguro</TableHead>
                          <TableHead>Tipo de negócio</TableHead>
                          <TableHead>Participação</TableHead>
                          <TableHead className="w-[60px]" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loadingCargos ? (
                          <TableSkeleton cols={5} />
                        ) : configsCargos.length === 0 ? (
                          <EmptyState label="Nenhuma regra por cargo cadastrada." />
                        ) : (
                          configsCargos.map((config) => (
                            <TableRow key={config.id}>
                              <TableCell className="font-medium">{config.nomeCargo}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="font-normal">
                                  {config.tipoSeguro}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <TipoNegocioBadge value={config.tipoNegocio} />
                              </TableCell>
                              <TableCell>
                                <PercentualCell value={config.percentualParticipacao} />
                              </TableCell>
                              <TableCell className="text-right">
                                <DeleteRowButton
                                  onDelete={() => deleteCargo.mutate(config.id)}
                                  label={`A configuração de ${config.nomeCargo} para ${config.tipoSeguro} será removida. O padrão global passará a se aplicar para este cargo.`}
                                />
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── Por Vendedor ── */}
              <TabsContent value="vendedores">
                <Card>
                  <CardHeader className="flex flex-row items-start justify-between pb-3">
                    <div className="space-y-1">
                      <CardTitle className="text-base">Por Vendedor</CardTitle>
                      <CardDescription>
                        Sobrescreve qualquer regra de cargo ou global para o vendedor selecionado.
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button size="sm" variant="outline" onClick={() => setDialogLoteOpen(true)}>
                        <Users className="h-3.5 w-3.5 mr-1" />
                        Em lote
                      </Button>
                      <Button size="sm" onClick={() => setDialogVendedorOpen(true)}>
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Adicionar
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead>Vendedor</TableHead>
                          <TableHead>Tipo de seguro</TableHead>
                          <TableHead>Tipo de negócio</TableHead>
                          <TableHead>Participação</TableHead>
                          <TableHead className="w-[60px]" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loadingVendedores ? (
                          <TableSkeleton cols={5} />
                        ) : configsVendedores.length === 0 ? (
                          <EmptyState label="Nenhuma regra por vendedor cadastrada." />
                        ) : (
                          configsVendedores.map((config) => (
                            <TableRow key={config.id}>
                              <TableCell className="font-medium">{config.nomeUsuario}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="font-normal">
                                  {config.tipoSeguro}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <TipoNegocioBadge value={config.tipoNegocio} />
                              </TableCell>
                              <TableCell>
                                <PercentualCell value={config.percentualParticipacao} />
                              </TableCell>
                              <TableCell className="text-right">
                                <DeleteRowButton
                                  onDelete={() => deleteVendedor.mutate(config.id)}
                                  label={`A configuração específica de ${config.nomeUsuario} para ${config.tipoSeguro} será removida. O padrão de cargo ou global passará a se aplicar.`}
                                />
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* ── Lançamentos ── */}
          <TabsContent value="lancamentos">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Lançamentos de Comissão</CardTitle>
                <CardDescription>
                  Gerencie parcelas individuais — controle recebimento da seguradora e pagamento aos vendedores.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LancamentosComissao />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Projeção ── */}
          <TabsContent value="projecao">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Projeção de Recebimentos</CardTitle>
                <CardDescription>
                  Visão mensal dos valores esperados das seguradoras e a pagar aos vendedores.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ProjecaoLancamentos />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Extrato ── */}
          <TabsContent value="extrato">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Extrato de Comissões</CardTitle>
                <CardDescription>
                  Visualize e gerencie o status de pagamento das comissões por documento de venda.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ExtratoComissoes />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Relatório ── */}
          <TabsContent value="relatorio">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Relatório de Comissões</CardTitle>
                <CardDescription>
                  Visão gerencial com totais, ranking de vendedores e breakdown por produto.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RelatorioComissoes />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Histórico ── */}
          <TabsContent value="historico">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Histórico de Alterações</CardTitle>
                <CardDescription>
                  Registro de todas as criações, atualizações e exclusões de configurações de comissão.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <HistoricoConfigs />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <AdicionarConfigVendedorDialog
          open={dialogVendedorOpen}
          onOpenChange={setDialogVendedorOpen}
        />
        <AdicionarConfigCargoDialog
          open={dialogCargoOpen}
          onOpenChange={setDialogCargoOpen}
        />
        <ConfigLoteDialog
          open={dialogLoteOpen}
          onOpenChange={setDialogLoteOpen}
        />
      </div>
    </PageGuard>
  );
}
