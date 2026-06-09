
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/core/ui/dialog';
import { Button } from '@/core/ui/button';
import { Label } from '@/core/ui/label';
import { Separator } from '@/core/ui/separator';
import { Badge } from '@/core/ui/badge';
import { toast } from 'sonner';
import { handleApiError } from '@/core/utils/handle-api-error';
import { api } from '@/infra/http/api';
import { areaTrabalhoKeys } from '../http';
import type { DocumentoVenda } from '@/types/documento-venda';
import {
  FileText,
  Calendar,
  DollarSign,
  User,
  Package,
  Archive,
  AlertCircle,
  Plus,
} from 'lucide-react';
import { dayjs } from '@/core/utils/date-utils';
import { usePermissions } from '@/core/hooks/use-permissions';
import { IncluirItemDialog } from './incluir-item-dialog';

interface DocumentoConvertidoDialogProps {
  documento: DocumentoVenda | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DocumentoConvertidoDialog({
  documento,
  open,
  onOpenChange,
}: DocumentoConvertidoDialogProps) {
  const [showConfirmArchive, setShowConfirmArchive] = useState(false);
  const [showIncluirItem, setShowIncluirItem] = useState(false);
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();

  const arquivarMutation = useMutation({
    mutationFn: async () => {
      if (!documento) return;
      const response = await api.post(
        `/sales-documents/${documento.id}/arquivar`,
      );
      return response;
    },
    onSuccess: () => {
      toast.success('Documento arquivado', {
        description: 'O documento foi arquivado com sucesso.',
      });
      queryClient.invalidateQueries({
        queryKey: areaTrabalhoKeys.convertidos(),
      });
      queryClient.invalidateQueries({ queryKey: areaTrabalhoKeys.resumo() });
      onOpenChange(false);
      setShowConfirmArchive(false);
    },
    onError: (error: unknown) => {
      toast.error(handleApiError(error));
    },
  });

  if (!documento) return null;

  const formatCurrency = (value: number | string | null) => {
    if (value === null || value === undefined) return '-';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '-';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(num);
  };

  const formatDate = (date: string | undefined) => {
    if (!date) return '-';
    try {
      const d = date.includes('T') ? dayjs(date) : dayjs(date, 'YYYY-MM-DD');
      return d.format('DD [de] MMMM [de] YYYY');
    } catch {
      return 'Data inválida';
    }
  };

  const getClienteName = () => {
    if (documento.cliente.tipoPessoa === 'PF') {
      return documento.cliente.nome || 'Sem nome';
    }
    return documento.cliente.razaoSocial || 'Sem razão social';
  };

  const handleArquivar = () => {
    arquivarMutation.mutate();
  };

  if (showConfirmArchive) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Archive className="size-4 text-orange-500" />
              Arquivar Documento
            </DialogTitle>
            <DialogDescription>
              Confirme se deseja arquivar este documento.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900 rounded-lg p-4 flex items-start gap-2">
            <AlertCircle className="size-4 text-orange-600 dark:text-orange-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-semibold text-orange-900 dark:text-orange-100">
                Atenção!
              </p>
              <p className="text-orange-800 dark:text-orange-200 mt-1">
                Ao arquivar, este documento não aparecerá mais na lista de
                convertidos. Você poderá visualizá-lo posteriormente na área de
                documentos arquivados.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowConfirmArchive(false)}
              disabled={arquivarMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="default"
              onClick={handleArquivar}
              disabled={arquivarMutation.isPending}
            >
              {arquivarMutation.isPending
                ? 'Arquivando...'
                : 'Confirmar Arquivamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="text-2xl">
                Documento Convertido
              </DialogTitle>
              <DialogDescription>Número: {documento.numero}</DialogDescription>
            </div>
            <Badge variant="default">Ativo</Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações do Cliente */}
          <div>
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
              <User className="size-4" />
              Cliente
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Nome</Label>
                <p className="font-medium">{getClienteName()}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Tipo</Label>
                <p className="font-medium">
                  {documento.cliente.tipoPessoa === 'PF'
                    ? 'Pessoa Física'
                    : 'Pessoa Jurídica'}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Informações do Produto */}
          <div>
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
              <Package className="size-4" />
              Produto
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Produto</Label>
                <p className="font-medium">{documento.produto.nomeProduto}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">
                  Tipo de Seguro
                </Label>
                <p className="font-medium">{documento.produto.tipoSeguro}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Valores */}
          <div>
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
              <DollarSign className="size-4" />
              Valores
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/50 dark:bg-muted/20 p-4 rounded-lg border border-border">
                <Label className="text-xs text-muted-foreground">
                  Prêmio Líquido
                </Label>
                <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                  {formatCurrency(documento.premioLiquido)}
                </p>
              </div>
              {hasPermission('vendas:gerenciar_comissoes') && (
                <div className="bg-muted/50 dark:bg-muted/20 p-4 rounded-lg border border-border">
                  <Label className="text-xs text-muted-foreground">
                    Comissão
                  </Label>
                  <p className="text-lg font-semibold">
                    {formatCurrency(documento.valorComissao)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {documento.percentualComissao}% de comissão
                  </p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Vigência */}
          <div>
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
              <Calendar className="size-4" />
              Vigência
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Início</Label>
                <p className="font-medium">
                  {formatDate(documento.vigenciaInicio)}
                </p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Fim</Label>
                <p className="font-medium">
                  {formatDate(documento.vigenciaFim)}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Apólice */}
          <div>
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
              <FileText className="size-4" />
              Apólice
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">
                  Número da Apólice Externa
                </Label>
                <p className="font-medium">
                  {documento.numeroApoliceExterna || 'Não informado'}
                </p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">
                  Data de Emissão
                </Label>
                <p className="font-medium">
                  {documento.dataEmissao
                    ? formatDate(documento.dataEmissao)
                    : 'Não informado'}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Vendedor e Aprovação */}
          <div className="grid grid-cols-2 gap-4">
            {documento.vendedor && (
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Vendedor
                </h4>
                <p className="font-medium">{documento.vendedor.nome}</p>
              </div>
            )}
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Aprovado por
              </h4>
              <p className="font-medium">
                {documento.aprovadoPor?.nome || 'Não informado'}
              </p>
              {documento.dataAprovacaoCadastro && (
                <p className="text-xs text-muted-foreground mt-1">
                  em {formatDate(documento.dataAprovacaoCadastro)}
                </p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowIncluirItem(true)}
          >
            <Plus className="mr-2 size-4" />
            Incluir
          </Button>
          <Button
            variant="default"
            onClick={() => setShowConfirmArchive(true)}
            disabled={arquivarMutation.isPending}
          >
            <Archive className="mr-2 size-4" />
            Arquivar Documento
          </Button>
        </DialogFooter>
      </DialogContent>

      <IncluirItemDialog
        documento={documento}
        open={showIncluirItem}
        onOpenChange={setShowIncluirItem}
      />
    </Dialog>
  );
}
