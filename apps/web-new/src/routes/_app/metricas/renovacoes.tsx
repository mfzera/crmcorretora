import { createFileRoute } from '@tanstack/react-router';

import { useState, useCallback } from 'react';
import { Plus, RefreshCcw } from 'lucide-react';
import { Button } from '@/core/ui/button';
import { PageGuard } from '@/modules/auth/components/page-guard';
import { usePermissions } from '@/core/hooks/use-permissions';
import { useRenovacoesGestao, useSolicitarExclusaoRenovacao, useAceitarExclusaoRenovacao, type RenovacaoGestao, type FiltrosRenovacoesGestao } from '@/modules/renovacoes/http';
import { RenovacoesKpis } from '@/modules/metricas/components/renovacoes-gestao/renovacoes-kpis';
import { RenovacoesFiltros } from '@/modules/metricas/components/renovacoes-gestao/renovacoes-filtros';
import { RenovacoesTabela } from '@/modules/metricas/components/renovacoes-gestao/renovacoes-tabela';
import { RenovacoesBarraAcoes } from '@/modules/metricas/components/renovacoes-gestao/renovacoes-barra-acoes';
import { RenovacaoGestaoDetalheDialog } from '@/modules/metricas/components/renovacoes-gestao/renovacao-gestao-detalhe-dialog';
import { CriarRenovacaoManualDialog } from '@/modules/metricas/components/renovacoes-gestao/criar-renovacao-manual-dialog';
import { TransferirRenovacoesDialog } from '@/modules/area-trabalho/components/transferir-renovacoes-dialog';
import { SolicitarExclusaoRenovacaoDialog } from '@/modules/area-trabalho/components/solicitar-exclusao-renovacao-dialog';
import { toast } from 'sonner';
import { handleApiError } from '@/core/utils/handle-api-error';

export const Route = createFileRoute('/_app/metricas/renovacoes')({
  component: RenovacoesGestaoPage,
});


function RenovacoesGestaoContent() {
  const { hasPermission } = usePermissions();
  const podeExcluirDireto = hasPermission('aceitar_exclusao:renovacao');
  const podeCriar = hasPermission('vendas:editar_documento_venda');

  const [filtros, setFiltros] = useState<FiltrosRenovacoesGestao>({});
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [renovacaoAberta, setRenovacaoAberta] = useState<RenovacaoGestao | null>(null);
  const [transferirOpen, setTransferirOpen] = useState(false);
  const [excluirOpen, setExcluirOpen] = useState(false);
  const [criarOpen, setCriarOpen] = useState(false);
  const [isExcluindo, setIsExcluindo] = useState(false);

  const solicitarExclusao = useSolicitarExclusaoRenovacao();
  const aceitarExclusao = useAceitarExclusaoRenovacao();

  const { data, isLoading, isFetching } = useRenovacoesGestao({ ...filtros, page, limit });
  const renovacoes: RenovacaoGestao[] = (data as any)?.data ?? [];
  const meta = (data as any)?.meta ?? { total: 0, page: 1, totalPages: 1 };

  const handleFiltrosChange = useCallback((novosFiltros: Partial<FiltrosRenovacoesGestao>) => {
    setFiltros((prev) => ({ ...prev, ...novosFiltros }));
    setPage(1);
    setSelecionados([]);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
    setSelecionados([]);
  }, []);

  const handlePageSizeChange = useCallback((newSize: number) => {
    setLimit(newSize);
    setPage(1);
    setSelecionados([]);
  }, []);

  const handleDesmarcar = useCallback(() => setSelecionados([]), []);

  const handleExcluirDireto = async () => {
    setIsExcluindo(true);
    try {
      for (const id of selecionados) {
        const solicitacao = await solicitarExclusao.mutateAsync({ renovacaoId: id, motivo: 'Exclusão direta pelo gestor' });
        const solicitacaoId = (solicitacao as any)?.id ?? (solicitacao as any)?.data?.id;
        if (solicitacaoId) {
          await aceitarExclusao.mutateAsync(solicitacaoId);
        }
      }
      toast.success(`${selecionados.length} renovação(ões) excluída(s) com sucesso`);
      setSelecionados([]);
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setIsExcluindo(false);
    }
  };

  const handleExcluir = () => {
    if (podeExcluirDireto) {
      handleExcluirDireto();
    } else {
      setExcluirOpen(true);
    }
  };

  // Para reatribuição: pega o vendedor da primeira renovação selecionada
  const primeiraRenovacaoSelecionada = renovacoes.find((r) => selecionados.includes(r.id));
  const vendedorAtualId = primeiraRenovacaoSelecionada?.vendedorId ?? '';

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <RefreshCcw className="size-6" />
            Gestão de Renovações
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visão centralizada de todas as renovações da corretora
          </p>
        </div>
        {podeCriar && (
          <Button onClick={() => setCriarOpen(true)} className="gap-2">
            <Plus className="size-4" />
            Nova Renovação
          </Button>
        )}
      </div>

      {/* KPIs */}
      <RenovacoesKpis />

      {/* Filtros */}
      <RenovacoesFiltros filtros={filtros} onChange={handleFiltrosChange} />

      {/* Barra de ações (multi-seleção) */}
      <RenovacoesBarraAcoes
        selecionados={selecionados}
        onDesmarcar={handleDesmarcar}
        onReatribuir={() => setTransferirOpen(true)}
        onExcluir={handleExcluir}
        podeExcluir={true}
        isExcluindo={isExcluindo}
      />

      {/* Tabela */}
      <RenovacoesTabela
        items={renovacoes}
        isLoading={isLoading}
        isFetching={isFetching}
        selecionados={selecionados}
        onToggleItem={(id) =>
          setSelecionados((prev) =>
            prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
          )
        }
        onToggleAll={() => {
          const todosNaPagina = renovacoes.map((r) => r.id);
          const todosSelecionados = todosNaPagina.every((id) => selecionados.includes(id));
          setSelecionados(todosSelecionados
            ? selecionados.filter((id) => !todosNaPagina.includes(id))
            : [...new Set([...selecionados, ...todosNaPagina])],
          );
        }}
        onItemClick={setRenovacaoAberta}
        page={page}
        totalPages={meta.totalPages}
        total={meta.total}
        pageSize={limit}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />

      {/* Dialogs */}
      <RenovacaoGestaoDetalheDialog
        renovacao={renovacaoAberta}
        open={renovacaoAberta !== null}
        onClose={() => setRenovacaoAberta(null)}
      />

      <TransferirRenovacoesDialog
        open={transferirOpen}
        onOpenChange={setTransferirOpen}
        renovacaoIds={selecionados}
        vendedorAtualId={vendedorAtualId}
        onSuccess={() => {
          setSelecionados([]);
          setTransferirOpen(false);
        }}
      />

      {!podeExcluirDireto && (
        <SolicitarExclusaoRenovacaoDialog
          open={excluirOpen}
          onOpenChange={setExcluirOpen}
          renovacaoIds={selecionados}
          onSuccess={() => {
            setSelecionados([]);
            setExcluirOpen(false);
          }}
        />
      )}

      <CriarRenovacaoManualDialog
        open={criarOpen}
        onOpenChange={setCriarOpen}
        onSuccess={() => setCriarOpen(false)}
      />
    </div>
  );
}

function RenovacoesGestaoPage() {
  return (
    <PageGuard permission="metricas:acessar">
      <RenovacoesGestaoContent />
    </PageGuard>
  );
}
