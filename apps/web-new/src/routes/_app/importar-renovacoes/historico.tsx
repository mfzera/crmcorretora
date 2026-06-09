import { createFileRoute } from '@tanstack/react-router';

import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Upload, History, Search, X } from 'lucide-react';
import { Button } from '@/core/ui/button';
import { Input } from '@/core/ui/input';
import { PageGuard } from '@/modules/auth/components/page-guard';
import { ImportHistoryTable } from '@/modules/importacao-renovacoes/components/import-history-table';
import { useImportacoesHistorico } from '@/modules/importacao-renovacoes/http';
import { useDebounce } from '@/core/hooks/use-debounce';

export const Route = createFileRoute('/_app/importar-renovacoes/historico')({
  component: HistoricoImportacoesPage,
});


function HistoricoImportacoesPage() {
  return (
    <PageGuard permission="importar_renovacoes:acessar">
      <HistoricoImportacoesPageContent />
    </PageGuard>
  );
}

function HistoricoImportacoesPageContent() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [busca, setBusca] = useState('');
  const buscaDebounced = useDebounce(busca, 300);

  const { data, isLoading } = useImportacoesHistorico({
    page,
    limit: 20,
    busca: buscaDebounced || undefined,
  });

  const handleBuscaChange = (value: string) => {
    setBusca(value);
    setPage(1);
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <History className="h-6 w-6 text-muted-foreground" />
            <h1 className="text-3xl font-bold">Histórico de Importações</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            Acompanhe todas as importações realizadas, erros, pendentes e rollbacks
          </p>
        </div>
        <Button onClick={() => navigate({ to: '/importar-renovacoes' })}>
          <Upload className="h-4 w-4 mr-2" />
          Nova Importação
        </Button>
      </div>

      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar por nome do arquivo..."
            value={busca}
            onChange={(e) => handleBuscaChange(e.target.value)}
            className="pl-9 pr-9"
          />
          {busca && (
            <button
              onClick={() => handleBuscaChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <ImportHistoryTable
        importacoes={data?.data ?? []}
        isLoading={isLoading}
        page={page}
        totalPages={data?.meta.totalPages ?? 1}
        total={data?.meta.total ?? 0}
        onPageChange={setPage}
      />
    </div>
  );
}
