
import { useState, useDeferredValue } from 'react';
import { Search, Loader2, FileText, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/core/ui/dialog';
import { Button } from '@/core/ui/button';
import { Input } from '@/core/ui/input';
import { cn } from '@/core/utils';
import { dayjs } from '@/core/utils/date-utils';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/infra/http/api';
import { toast } from 'sonner';
import { handleApiError } from '@/core/utils/handle-api-error';
import { useCreateManualRenewal } from '@/modules/renovacoes/http';
import { formatCurrency } from '../metricas-utils';

function getNomeCliente(doc: any): string {
  const c = doc.cliente;
  if (!c) return 'Sem cliente';
  return c.tipoPessoa === 'PF' ? c.nome ?? '-' : c.razaoSocial ?? '-';
}

export function CriarRenovacaoManualDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}) {
  const [search, setSearch] = useState('');
  const [selecionado, setSelecionado] = useState<any | null>(null);
  const deferredSearch = useDeferredValue(search);

  const criarMutation = useCreateManualRenewal();

  const { data: documentos = [], isLoading } = useQuery({
    queryKey: ['documentos-venda-busca-renovacao', deferredSearch],
    queryFn: async () => {
      const response = await api.get<any[]>('/sales-documents', {
        params: { status: 'ATIVO', search: deferredSearch, limit: 20 },
      });
      return Array.isArray(response) ? response : (response as any)?.data ?? [];
    },
    enabled: deferredSearch.length >= 3,
    staleTime: 30_000,
  });

  const handleConfirmar = async () => {
    if (!selecionado) return;
    try {
      await criarMutation.mutateAsync(selecionado.id);
      toast.success('Renovação criada com sucesso!');
      onOpenChange(false);
      setSearch('');
      setSelecionado(null);
      onSuccess?.();
    } catch (err) {
      toast.error(handleApiError(err));
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setSearch('');
    setSelecionado(null);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova Renovação Manual</DialogTitle>
          <DialogDescription>
            Busque um documento de venda ativo para criar uma renovação a partir dele.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar por cliente ou produto..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSelecionado(null);
              }}
              autoFocus
            />
          </div>

          {/* Resultados */}
          {deferredSearch.length < 3 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Digite ao menos 3 caracteres para buscar
            </p>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : documentos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum documento ativo encontrado
            </p>
          ) : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {documentos.map((doc: any) => (
                <button
                  key={doc.id}
                  type="button"
                  className={cn(
                    'w-full flex items-start gap-3 p-3 rounded-lg border-2 text-left transition-all',
                    'hover:border-primary hover:bg-accent',
                    selecionado?.id === doc.id
                      ? 'border-primary bg-accent'
                      : 'border-border',
                  )}
                  onClick={() => setSelecionado(doc)}
                >
                  <FileText className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{getNomeCliente(doc)}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {doc.produto?.nomeProduto ?? '-'}
                      {doc.vigenciaFim && ` · vence ${dayjs(doc.vigenciaFim).format('DD/MM/YYYY')}`}
                    </p>
                    {doc.premioLiquido && (
                      <p className="text-xs font-medium mt-0.5">
                        {formatCurrency(doc.premioLiquido)}
                      </p>
                    )}
                  </div>
                  {selecionado?.id === doc.id && (
                    <Check className="size-4 text-primary shrink-0 mt-0.5" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancelar</Button>
          <Button
            onClick={handleConfirmar}
            disabled={!selecionado || criarMutation.isPending}
          >
            {criarMutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin mr-2" />
                Criando...
              </>
            ) : (
              'Criar Renovação'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
