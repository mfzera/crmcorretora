
import { useState } from 'react';
import { Eye } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/core/ui/dialog';
import { Button } from '@/core/ui/button';
import { Badge } from '@/core/ui/badge';
import { useProduto } from '@/modules/produtos/http';
import { getTipoSeguroLabel, getTipoSeguroBadgeColor } from '@/types/produto';

interface VisualizarProdutoDialogProps {
  produtoId: string;
  trigger?: React.ReactNode;
}

export function VisualizarProdutoDialog({
  produtoId,
  trigger,
}: VisualizarProdutoDialogProps) {
  const [open, setOpen] = useState(false);
  const { data: produto, isLoading } = useProduto(open ? produtoId : null);

  const formatCurrency = (value: string | null | undefined) => {
    if (!value) return 'Não definido';
    const num = parseFloat(value);
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(num);
  };

  const formatPercentage = (value: string | null | undefined) => {
    if (!value) return 'Não definido';
    return `${parseFloat(value).toFixed(2)}%`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon">
            <Eye className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes do Produto</DialogTitle>
          <DialogDescription>
            Visualize as informações completas do produto de seguro
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">
            Carregando produto...
          </div>
        ) : produto ? (
          <div className="space-y-6">
            {/* Informações Básicas */}
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  Informações Básicas
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium">Nome do Produto</p>
                    <p className="text-lg">{produto.nomeProduto}</p>
                  </div>

                  <div className="flex gap-2">
                    <div>
                      <p className="text-sm font-medium mb-1">Tipo de Seguro</p>
                      <Badge
                        variant="outline"
                        className={getTipoSeguroBadgeColor(produto.tipoSeguro)}
                      >
                        {getTipoSeguroLabel(produto.tipoSeguro)}
                      </Badge>
                    </div>

                    <div>
                      <p className="text-sm font-medium mb-1">Status</p>
                      <Badge variant={produto.ativo ? 'default' : 'secondary'}>
                        {produto.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                  </div>

                  {produto.descricao && (
                    <div>
                      <p className="text-sm font-medium">Descrição</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {produto.descricao}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Valores */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                Valores e Comissões
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-lg border p-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Prêmio Mínimo
                  </p>
                  <p className="text-lg font-semibold mt-1">
                    {formatCurrency(produto.premioMinimo)}
                  </p>
                </div>

                <div className="rounded-lg border p-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Prêmio Máximo
                  </p>
                  <p className="text-lg font-semibold mt-1">
                    {formatCurrency(produto.premioMaximo)}
                  </p>
                </div>

                <div className="rounded-lg border p-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Comissão Padrão
                  </p>
                  <p className="text-lg font-semibold mt-1">
                    {formatPercentage(produto.percentualComissaoPadrao)}
                  </p>
                </div>
              </div>
            </div>

            {/* Metadados */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                Informações do Sistema
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ID:</span>
                  <span className="font-mono text-xs">{produto.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Criado em:</span>
                  <span>{formatDate(produto.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Última atualização:
                  </span>
                  <span>{formatDate(produto.updatedAt)}</span>
                </div>
                {produto.deletedAt && (
                  <div className="flex justify-between text-destructive">
                    <span>Excluído em:</span>
                    <span>{formatDate(produto.deletedAt)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            Produto não encontrado
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
