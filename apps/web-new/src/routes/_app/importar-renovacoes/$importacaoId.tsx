import { createFileRoute } from '@tanstack/react-router';

import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { dayjs } from '@/core/utils/date-utils';
import {
  ArrowLeft,
  RefreshCw,
  RotateCcw,
  FileSpreadsheet,
  Upload,
  SkipForward,
} from 'lucide-react';
import { useDebounce } from '@/core/hooks/use-debounce';
import { Button } from '@/core/ui/button';
import { Skeleton } from '@/core/ui/skeleton';
import { PageGuard } from '@/modules/auth/components/page-guard';
import { ImportSummaryCards } from '@/modules/importacao-renovacoes/components/import-summary-cards';
import { ImportItemsTable } from '@/modules/importacao-renovacoes/components/import-items-table';
import { ImportPendingClients } from '@/modules/importacao-renovacoes/components/import-pending-clients';
import { ImportRetryDialog } from '@/modules/importacao-renovacoes/components/import-retry-dialog';
import { ImportRollbackDialog } from '@/modules/importacao-renovacoes/components/import-rollback-dialog';
import { ImportRetryPuladosDialog } from '@/modules/importacao-renovacoes/components/import-retry-pulados-dialog';
import { ImportacaoStatusBadge } from '@/modules/importacao-renovacoes/components/import-status-badge';
import {
  useImportacaoDetalhe,
  useRetryImportacao,
  useRollbackImportacao,
  useRetryPulados,
} from '@/modules/importacao-renovacoes/http';
import { toast } from 'sonner';

export const Route = createFileRoute('/_app/importar-renovacoes/$importacaoId')({
  component: ImportacaoDetalhePage,
});


function ImportacaoDetalhePage() {
  return (
    <PageGuard permission="importar_renovacoes:acessar">
      <ImportacaoDetalhePageContent />
    </PageGuard>
  );
}

function ImportacaoDetalhePageContent() {
  const { importacaoId = '' } = Route.useParams();
  const navigate = useNavigate();

  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [busca, setBusca] = useState('');
  const buscaDebounced = useDebounce(busca, 300);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [retryDialogOpen, setRetryDialogOpen] = useState(false);
  const [rollbackDialogOpen, setRollbackDialogOpen] = useState(false);
  const [retryPuladosDialogOpen, setRetryPuladosDialogOpen] = useState(false);

  const { data, isLoading, refetch } = useImportacaoDetalhe(importacaoId, {
    page,
    limit: 50,
    statusItem: statusFilter || undefined,
    busca: buscaDebounced || undefined,
  });

  const importacao = data?.importacao;

  const { data: pendingData, refetch: refetchPending } = useImportacaoDetalhe(
    importacao?.totalPendentes ? importacaoId : null,
    { statusItem: 'PENDENTE', limit: 1000, page: 1 },
  );

  const retryMutation = useRetryImportacao();
  const rollbackMutation = useRollbackImportacao();
  const retryPuladosMutation = useRetryPulados();

  const itens = data?.itens.data ?? [];
  const itensMeta = data?.itens.meta;

  const pendingItems = pendingData?.itens.data ?? [];

  const handleRetry = async () => {
    try {
      const result = await retryMutation.mutateAsync({ importacaoId });
      toast.success(
        `${result.retried} item(ns) retentado(s) · ${result.newSucesso} sucesso, ${result.newErros} erro(s)`,
      );
      setRetryDialogOpen(false);
      refetch();
      refetchPending();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao retentar itens');
    }
  };

  const handleRollback = async () => {
    try {
      const result = await rollbackMutation.mutateAsync({
        importacaoId,
        itemIds: selectedIds,
      });
      toast.success(
        `${result.reverted} item(ns) revertido(s)${result.blocked > 0 ? ` · ${result.blocked} bloqueado(s) (já trabalhados)` : ''}`,
      );
      setSelectedIds([]);
      setRollbackDialogOpen(false);
      refetch();
      refetchPending();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao reverter itens');
    }
  };

  const handleRetryPulados = async () => {
    try {
      const result = await retryPuladosMutation.mutateAsync({ importacaoId });
      toast.success(
        `${result.retried} item(ns) verificado(s) · ${result.newSucesso} processado(s) com sucesso · ${result.stillPulados} ainda pulado(s)`,
      );
      setRetryPuladosDialogOpen(false);
      refetch();
      refetchPending();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao reprocessar itens pulados');
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-6xl space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!importacao) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-4">
          <FileSpreadsheet className="h-12 w-12 opacity-40" />
          <p>Importação não encontrada</p>
          <Button
            variant="outline"
            onClick={() => navigate({ to: '/importar-renovacoes/historico' })}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Histórico
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      {/* Breadcrumb / Header */}
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <button
            onClick={() => navigate({ to: '/importar-renovacoes/historico' })}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Histórico de Importações
          </button>
          <div className="flex items-center gap-3 flex-wrap">
            <FileSpreadsheet className="h-6 w-6 text-muted-foreground flex-shrink-0" />
            <h1
              className="text-2xl font-bold truncate max-w-[400px]"
              title={importacao.nomeArquivo}
            >
              {importacao.nomeArquivo}
            </h1>
            <ImportacaoStatusBadge status={importacao.status} />
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
            <span>
              {dayjs(importacao.createdAt).format('DD/MM/YYYY [às] HH:mm')}
            </span>
            {importacao.usuarioNome && <span>Por: {importacao.usuarioNome}</span>}
            {importacao.vendedorNome && (
              <span>Vendedor: {importacao.vendedorNome}</span>
            )}
            <span>{importacao.totalLinhas} linhas</span>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {importacao.totalErros > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setRetryDialogOpen(true)}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retentar Falhas ({importacao.totalErros})
            </Button>
          )}
          {importacao.totalPulados > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setRetryPuladosDialogOpen(true)}
            >
              <SkipForward className="h-4 w-4 mr-2" />
              Verificar Itens Pulados ({importacao.totalPulados})
            </Button>
          )}
          {selectedIds.length > 0 && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setRollbackDialogOpen(true)}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reverter Selecionados ({selectedIds.length})
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate({ to: '/importar-renovacoes' })}
          >
            <Upload className="h-4 w-4 mr-2" />
            Nova Importação
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="mb-6">
        <ImportSummaryCards
          total={importacao.totalLinhas}
          sucesso={importacao.totalSucesso}
          erros={importacao.totalErros}
          pendentes={importacao.totalPendentes}
          pulados={importacao.totalPulados}
        />
      </div>

      {/* Pending Clients Section */}
      {pendingItems.length > 0 && (
        <div className="mb-6 p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
          <ImportPendingClients
            importacaoId={importacaoId}
            pendingItems={pendingItems}
            vendedorId={importacao.vendedorId}
            onProcessed={() => { refetch(); refetchPending(); }}
          />
        </div>
      )}

      {/* Items Table */}
      <ImportItemsTable
        itens={itens}
        total={itensMeta?.total ?? 0}
        page={page}
        totalPages={itensMeta?.totalPages ?? 1}
        isLoading={isLoading}
        statusFilter={statusFilter}
        busca={busca}
        selectedIds={selectedIds}
        onStatusFilterChange={(s) => {
          setStatusFilter(s);
          setPage(1);
        }}
        onBuscaChange={(b) => {
          setBusca(b);
          setPage(1);
        }}
        onPageChange={setPage}
        onSelectionChange={setSelectedIds}
        totalSucesso={importacao.totalSucesso}
        totalErros={importacao.totalErros}
        totalPendentes={importacao.totalPendentes}
        totalPulados={importacao.totalPulados}
        totalRevertidos={importacao.totalRevertidos ?? 0}
      />

      {/* Retry Dialog */}
      <ImportRetryDialog
        open={retryDialogOpen}
        onOpenChange={setRetryDialogOpen}
        onConfirm={handleRetry}
        isPending={retryMutation.isPending}
        count={importacao.totalErros}
      />

      {/* Rollback Dialog */}
      <ImportRollbackDialog
        open={rollbackDialogOpen}
        onOpenChange={setRollbackDialogOpen}
        onConfirm={handleRollback}
        isPending={rollbackMutation.isPending}
        count={selectedIds.length}
      />

      {/* Retry Pulados Dialog */}
      <ImportRetryPuladosDialog
        open={retryPuladosDialogOpen}
        onOpenChange={setRetryPuladosDialogOpen}
        onConfirm={handleRetryPulados}
        isPending={retryPuladosMutation.isPending}
        count={importacao.totalPulados}
      />
    </div>
  );
}
