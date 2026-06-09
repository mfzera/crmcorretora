import { createFileRoute } from '@tanstack/react-router';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminGuard } from '@/modules/admin/components/admin-guard';
import {
  adminApi,
  type Backup,
  type NeonBranch,
} from '@/infra/http/admin-api';
import { Button } from '@/core/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/core/ui/card';
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
  DialogTrigger,
} from '@/core/ui/dialog';
import { Progress } from '@/core/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/core/ui/select';
import { Badge } from '@/core/ui/badge';
import { Skeleton } from '@/core/ui/skeleton';
import { toast } from 'sonner';
import {
  Plus,
  CheckCircle,
  RotateCcw,
  RefreshCw,
  HardDrive,
  Clock,
  AlertTriangle,
  XCircle,
  Database,
  GitBranch,
  Trash2,
  FileCheck,
  Loader2,
} from 'lucide-react';
import { PageHeader } from '@/modules/admin/components/page-header';

export const Route = createFileRoute('/_admin/admin/backups')({
  component: AdminBackupsPage,
});


// ─── helpers ─────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m atrás`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h atrás`;
  return `${Math.floor(hours / 24)}d atrás`;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function StatusBadge({ status }: { status: Backup['status'] }) {
  if (status === 'concluido') return <Badge className="bg-green-500/15 text-green-500 border border-green-500/30">Concluído</Badge>;
  if (status === 'falhou') return <Badge variant="destructive">Falhou</Badge>;
  if (status === 'em_progresso') return <Badge className="bg-blue-500/15 text-blue-400 border border-blue-500/30">Em progresso</Badge>;
  return <Badge variant="secondary">{status ?? '—'}</Badge>;
}

function TipoBadge({ tipo }: { tipo: Backup['tipo'] }) {
  if (tipo === 'completo') return <Badge variant="outline" className="border-purple-300 text-purple-700">Completo</Badge>;
  return <Badge variant="outline">Incremental</Badge>;
}

// ─── page ─────────────────────────────────────────────────────────────────────

function AdminBackupsPage() {
  const queryClient = useQueryClient();

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['admin', 'backups', 'stats'],
    queryFn: () => adminApi.getBackupStats(),
    refetchInterval: 30_000,
  });

  const { data: listData, isLoading: listLoading, isFetching } = useQuery({
    queryKey: ['admin', 'backups', 'list'],
    queryFn: () => adminApi.getBackups({ limit: 50 }),
    refetchInterval: 30_000,
  });

  const { data: neonData } = useQuery({
    queryKey: ['admin', 'backups', 'neon'],
    queryFn: () => adminApi.getNeonBranches(),
    refetchInterval: 60_000,
  });

  const backups = listData?.backups ?? [];
  const stats = statsData;

  return (
    <AdminGuard requiredPermission="manage_backups">
      <div className="space-y-10">
        <PageHeader
          eyebrow="Continuidade de dados"
          title="Backup & Recuperação"
          description="Incremental diário 02:00 · Completo semanal domingo 03:00."
          actions={
            <>
              {isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ['admin', 'backups'] });
                }}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Atualizar
              </Button>
              <CreateBackupDialog />
            </>
          }
        />

        {/* Cards de saúde */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <HealthCard
            icon={<Clock className="h-5 w-5 text-blue-500" />}
            title="Último incremental"
            loading={statsLoading}
            value={stats?.ultimoIncremental ? timeAgo(stats.ultimoIncremental.iniciadoEm) : '—'}
            sub={stats?.ultimoIncremental ? formatBytes(stats.ultimoIncremental.totalBytes ?? 0) : 'Nenhum ainda'}
            status={stats?.ultimoIncremental?.status}
          />
          <HealthCard
            icon={<HardDrive className="h-5 w-5 text-purple-500" />}
            title="Último completo"
            loading={statsLoading}
            value={stats?.ultimoCompleto ? timeAgo(stats.ultimoCompleto.iniciadoEm) : '—'}
            sub={stats?.ultimoCompleto ? `${stats.ultimoCompleto.totalArquivos ?? 0} arquivos` : 'Nenhum ainda'}
            status={stats?.ultimoCompleto?.status}
          />
          <HealthCard
            icon={<Database className="h-5 w-5 text-emerald-500" />}
            title="Storage backup"
            loading={statsLoading}
            value={formatBytes(stats?.totalBytesBackup ?? 0)}
            sub="completo + incrementais ativos"
          />
          <HealthCard
            icon={
              (stats?.falhas7d ?? 0) > 0
                ? <AlertTriangle className="h-5 w-5 text-red-500" />
                : <FileCheck className="h-5 w-5 text-green-500" />
            }
            title="Falhas (7 dias)"
            loading={statsLoading}
            value={String(stats?.falhas7d ?? 0)}
            sub={(stats?.falhas7d ?? 0) > 0 ? 'Atenção necessária' : 'Tudo ok'}
            alert={(stats?.falhas7d ?? 0) > 0}
          />
        </div>

        {/* Linha: Próximos agendamentos + R2 Storage + Branches Neon */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Próximos agendamentos */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Próximas execuções
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {statsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10" />
                  <Skeleton className="h-10" />
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between p-3 rounded-md bg-muted/50">
                    <div>
                      <p className="text-sm font-medium">Incremental</p>
                      <p className="text-xs text-muted-foreground">Só arquivos novos</p>
                    </div>
                    <p className="text-sm font-mono">
                      {stats?.proximoIncremental ? formatDate(stats.proximoIncremental) : '—'}
                    </p>
                  </div>
                  <div className="flex items-start justify-between p-3 rounded-md bg-muted/50">
                    <div>
                      <p className="text-sm font-medium">Completo + Neon branch</p>
                      <p className="text-xs text-muted-foreground">+ limpeza 7 dias</p>
                    </div>
                    <p className="text-sm font-mono">
                      {stats?.proximoCompleto ? formatDate(stats.proximoCompleto) : '—'}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* R2 Storage */}
          <R2StoragePanel backups={backups} loading={listLoading} />

          {/* Branches Neon */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <GitBranch className="h-4 w-4" />
                Snapshots de banco (Neon)
                {neonData?.configured === false && (
                  <Badge variant="outline" className="ml-auto text-xs">Não configurado</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!neonData ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-8" />)}
                </div>
              ) : neonData.error ? (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <XCircle className="h-4 w-4" /> {neonData.error}
                </p>
              ) : !neonData.branches?.length ? (
                <p className="text-sm text-muted-foreground">
                  {neonData.configured
                    ? 'Nenhuma branch de backup criada ainda. Aguarde o próximo job semanal.'
                    : 'Configure NEON_PROJECT_ID e NEON_API_KEY para habilitar snapshots de banco.'}
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {(neonData.branches ?? []).map((branch) => (
                    <NeonBranchRow key={branch.id} branch={branch} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tabela de backups */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Histórico de backups</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {listLoading ? (
              <div className="p-6 space-y-3">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12" />)}
              </div>
            ) : backups.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">Nenhum backup encontrado.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Corretora</TableHead>
                    <TableHead className="hidden lg:table-cell">Arquivos</TableHead>
                    <TableHead className="hidden lg:table-cell">Tamanho</TableHead>
                    <TableHead className="hidden md:table-cell">Duração</TableHead>
                    <TableHead className="hidden sm:table-cell">Verificado</TableHead>
                    <TableHead>Iniciado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {backups.map((backup, i) => (
                    <TableRow key={backup.id ?? i}>
                      <TableCell><TipoBadge tipo={backup.tipo} /></TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <StatusBadge status={backup.status} />
                          {backup.erro && (
                            <span className="text-xs text-red-500 max-w-[160px] truncate" title={backup.erro}>
                              {backup.erro}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {backup.tenantName ?? (backup.corretoraId ? backup.corretoraId.slice(0, 8) + '…' : 'Global')}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">
                        {backup.totalArquivos ?? 0}
                        {(backup.arquivosNovos ?? 0) > 0 && backup.tipo === 'completo' && (
                          <span className="text-xs text-muted-foreground ml-1">
                            ({backup.arquivosNovos} novos)
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">
                        {formatBytes(backup.totalBytes ?? 0)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {backup.duracaoSegundos != null ? `${backup.duracaoSegundos}s` : '—'}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {backup.verificado
                          ? <CheckCircle className="h-4 w-4 text-green-500" />
                          : <span className="text-xs text-muted-foreground">Não</span>}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(backup.iniciadoEm)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {backup.status === 'concluido' && !backup.verificado && (
                            <VerifyButton backupId={backup.id} />
                          )}
                          {backup.status === 'concluido' && backup.verificado && (
                            <RestoreDialog backup={backup} />
                          )}
                          <DeleteButton backupId={backup.id} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminGuard>
  );
}

// ─── r2 storage panel ─────────────────────────────────────────────────────────

function R2StoragePanel({ backups, loading }: { backups: Backup[]; loading: boolean }) {
  const fullBackup = backups.find(b => b.tipo === 'completo' && b.status === 'concluido');
  const incrementals = backups
    .filter(b => b.tipo === 'incremental' && b.status === 'concluido')
    .slice(0, 5);

  const bucket =
    fullBackup?.backupBucket ||
    incrementals[0]?.backupBucket ||
    'ecotech-backups';

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <HardDrive className="h-4 w-4" />
          R2 Storage
          <Badge variant="outline" className="ml-auto text-xs font-mono">{bucket}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-8" />)}
          </div>
        ) : (
          <>
            {/* Full backup (current) */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Backup completo</p>
              {fullBackup ? (
                <div className="flex items-center justify-between px-3 py-2 rounded-md bg-muted/40 text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <HardDrive className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                    <span className="font-mono text-xs truncate">{fullBackup.backupPrefix}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 text-xs text-muted-foreground ml-2">
                    <span>{fullBackup.totalArquivos} arq.</span>
                    <span className="font-medium">{formatBytes(fullBackup.totalBytes)}</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground px-1">Nenhum ainda</p>
              )}
            </div>

            {/* Incrementais recentes */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Incrementais recentes</p>
              {incrementals.length === 0 ? (
                <p className="text-xs text-muted-foreground px-1">Nenhum ainda</p>
              ) : (
                <div className="space-y-1 max-h-36 overflow-y-auto">
                  {incrementals.map(b => (
                    <div key={b.id} className="flex items-center justify-between px-3 py-1.5 rounded-md bg-muted/40 text-xs">
                      <span className="text-muted-foreground">{formatDate(b.iniciadoEm)}</span>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span>{b.arquivosNovos ?? b.totalArquivos} novos</span>
                        <span className="font-medium">{formatBytes(b.totalBytes)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── health card ──────────────────────────────────────────────────────────────

interface HealthCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  sub: string;
  loading?: boolean;
  status?: string;
  alert?: boolean;
}

function HealthCard({ icon, title, value, sub, loading, status, alert }: HealthCardProps) {
  return (
    <Card className={alert ? 'border-red-200' : ''}>
      <CardContent className="p-4">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-7 w-16" />
            <Skeleton className="h-3 w-20" />
          </div>
        ) : (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {icon}
              {title}
            </div>
            <p className="text-2xl font-bold">{value}</p>
            <div className="flex items-center gap-1">
              {status === 'falhou' && <XCircle className="h-3 w-3 text-red-500" />}
              {status === 'concluido' && <CheckCircle className="h-3 w-3 text-green-500" />}
              <p className="text-xs text-muted-foreground">{sub}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── neon branch row ──────────────────────────────────────────────────────────

function NeonBranchRow({ branch }: { branch: NeonBranch }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 rounded-md bg-muted/40 text-sm">
      <div className="flex items-center gap-2 min-w-0">
        <GitBranch className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
        <span className="font-mono truncate">{branch.name}</span>
      </div>
      <div className="flex items-center gap-3 shrink-0 text-xs text-muted-foreground ml-2">
        {branch.logicalSize > 0 && <span>{formatBytes(branch.logicalSize)}</span>}
        <span>{timeAgo(branch.createdAt)}</span>
      </div>
    </div>
  );
}

// ─── actions ──────────────────────────────────────────────────────────────────

type BackupPhase = 'form' | 'running' | 'success' | 'error';

interface BackupResult {
  totalArquivos?: number;
  totalBytes?: number;
  duracaoSegundos?: number;
  status?: string;
}

function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}

function CreateBackupDialog() {
  const [open, setOpen] = useState(false);
  const [tipo, setTipo] = useState<'completo' | 'incremental'>('incremental');
  const [phase, setPhase] = useState<BackupPhase>('form');
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<BackupResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const queryClient = useQueryClient();

  function startTimer() {
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
  }

  function stopTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function resetDialog() {
    stopTimer();
    setPhase('form');
    setElapsed(0);
    setResult(null);
    setErrorMsg('');
  }

  function handleOpenChange(next: boolean) {
    if (phase === 'running') return; // bloqueia fechar durante execução
    if (!next) resetDialog();
    setOpen(next);
  }

  const mutation = useMutation({
    mutationFn: () => adminApi.createBackup({ tipo }),
    onMutate: () => {
      setPhase('running');
      startTimer();
    },
    onSuccess: (data) => {
      stopTimer();
      queryClient.invalidateQueries({ queryKey: ['admin', 'backups'] });
      setResult(data.backup as BackupResult);
      setPhase('success');
    },
    onError: (error: Error) => {
      stopTimer();
      setErrorMsg(error.message);
      setPhase('error');
    },
  });

  // limpa timer se componente desmontar
  useEffect(() => () => stopTimer(), []);

  // Barra de progresso simulada: sobe até 90% em ~3min e congela até completar
  const fakeProgress = phase === 'running'
    ? Math.min(90, Math.round((elapsed / 180) * 90))
    : phase === 'success' ? 100 : 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Novo Backup
        </Button>
      </DialogTrigger>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => phase === 'running' && e.preventDefault()}
        onEscapeKeyDown={(e) => phase === 'running' && e.preventDefault()}
      >
        {/* ─── form ─── */}
        {phase === 'form' && (
          <>
            <DialogHeader>
              <DialogTitle>Criar Backup Manual</DialogTitle>
              <DialogDescription>
                Inicia um backup global imediatamente (fora do schedule automático).
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <Select value={tipo} onValueChange={(v) => setTipo(v as typeof tipo)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="incremental">Incremental — só arquivos novos</SelectItem>
                  <SelectItem value="completo">Completo — todos os arquivos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={() => mutation.mutate()}>Criar Backup</Button>
            </DialogFooter>
          </>
        )}

        {/* ─── running ─── */}
        {phase === 'running' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                Backup em andamento…
              </DialogTitle>
              <DialogDescription>
                {tipo === 'completo' ? 'Backup completo (arquivos + snapshot Neon)' : 'Backup incremental'}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <Progress value={fakeProgress} className="h-2" />
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Copiando arquivos para R2…</span>
                <span className="font-mono tabular-nums">{formatElapsed(elapsed)}</span>
              </div>
              <p className="text-xs text-amber-500 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                Não feche nem navegue para outra página até concluir.
              </p>
            </div>
          </>
        )}

        {/* ─── success ─── */}
        {phase === 'success' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-500">
                <CheckCircle className="h-5 w-5" />
                Backup concluído
              </DialogTitle>
            </DialogHeader>
            <div className="py-3 space-y-2 text-sm">
              {result?.totalArquivos != null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Arquivos</span>
                  <span>{result.totalArquivos.toLocaleString('pt-BR')}</span>
                </div>
              )}
              {result?.totalBytes != null && result.totalBytes > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tamanho</span>
                  <span>{formatBytes(result.totalBytes)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Duração</span>
                <span className="font-mono">{formatElapsed(elapsed)}</span>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => { resetDialog(); setOpen(false); }}>Fechar</Button>
            </DialogFooter>
          </>
        )}

        {/* ─── error ─── */}
        {phase === 'error' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <XCircle className="h-5 w-5" />
                Falha no backup
              </DialogTitle>
              <DialogDescription className="text-destructive/80">{errorMsg}</DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => { resetDialog(); setOpen(false); }}>Fechar</Button>
              <Button onClick={() => { resetDialog(); mutation.mutate(); }}>Tentar novamente</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function VerifyButton({ backupId }: { backupId: string }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => adminApi.verifyBackup(backupId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'backups'] });
      if (data.isValid) toast.success('Backup válido');
      else toast.error('Backup corrompido');
    },
    onError: (e: Error) => toast.error('Erro ao verificar', { description: e.message }),
  });

  return (
    <Button variant="outline" size="sm" title="Verificar integridade" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
      {mutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
    </Button>
  );
}

function RestoreDialog({ backup }: { backup: Backup }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => adminApi.restoreBackup(backup.id, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'backups'] });
      toast.success('Restauração iniciada');
      setOpen(false);
    },
    onError: (e: Error) => toast.error('Erro ao restaurar', { description: e.message }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" title="Restaurar backup">
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Restaurar Backup</DialogTitle>
          <DialogDescription>
            Esta operação sobrescreve os arquivos atuais com os do backup. Não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>
        <div className="py-2 space-y-1 text-sm">
          <p><span className="text-muted-foreground">Tipo:</span> {backup.tipo}</p>
          <p><span className="text-muted-foreground">Iniciado em:</span> {formatDate(backup.iniciadoEm)}</p>
          <p><span className="text-muted-foreground">Arquivos:</span> {backup.totalArquivos}</p>
          <p><span className="text-muted-foreground">Tamanho:</span> {formatBytes(backup.totalBytes)}</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="destructive" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            {mutation.isPending ? 'Restaurando…' : 'Confirmar Restauração'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteButton({ backupId }: { backupId: string }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => adminApi.deleteBackup(backupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'backups'] });
      toast.success('Backup removido');
      setOpen(false);
    },
    onError: (e: Error) => toast.error('Erro ao remover', { description: e.message }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" title="Remover backup" className="text-muted-foreground hover:text-destructive">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remover Backup</DialogTitle>
          <DialogDescription>
            Remove o registro e os arquivos do R2. Esta ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="destructive" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            {mutation.isPending ? 'Removendo…' : 'Remover'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
