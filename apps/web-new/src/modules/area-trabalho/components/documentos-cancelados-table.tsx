
import { dayjs } from '@/core/utils/date-utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/core/ui/table';
import { Badge } from '@/core/ui/badge';
import { XCircle } from 'lucide-react';
import { useDocumentosCancelados } from '../http';
import type { DocumentoCancelado } from '@/types/area-trabalho';

export function DocumentosCanceladosTable() {
  const { data: documentos = [], isLoading } = useDocumentosCancelados();

  const formatCurrency = (value: number | null) => {
    if (value === null) return '-';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getClienteName = (documento: DocumentoCancelado) => {
    const cliente = documento.cliente;
    if (cliente.tipoPessoa === 'PF') {
      return cliente.nome || 'Sem nome';
    }
    return cliente.razaoSocial || cliente.nomeFantasia || 'Sem razão social';
  };

  const getMotivoLabel = (motivo: string | null) => {
    if (!motivo) return 'Não informado';

    const motivosLabels: Record<string, string> = {
      PRECO: 'Preço',
      CONCORRENCIA: 'Concorrência',
      INADIMPLENCIA: 'Inadimplência',
      SOLICITACAO_CLIENTE: 'Solicitação do Cliente',
      SINISTRO: 'Sinistro',
      OUTROS: 'Outros',
    };

    return motivosLabels[motivo] || motivo;
  };

  const getMotivoColor = (motivo: string | null) => {
    if (!motivo) return 'bg-gray-100 text-gray-800';

    const colors: Record<string, string> = {
      PRECO: 'bg-yellow-100 text-yellow-800',
      CONCORRENCIA: 'bg-orange-100 text-orange-800',
      INADIMPLENCIA: 'bg-red-100 text-red-800',
      SOLICITACAO_CLIENTE: 'bg-blue-100 text-blue-800',
      SINISTRO: 'bg-purple-100 text-purple-800',
      OUTROS: 'bg-gray-100 text-gray-800',
    };

    return colors[motivo] || 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Carregando documentos...</p>
      </div>
    );
  }

  if (documentos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <XCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">
          Nenhum documento cancelado nos últimos 30 dias
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Apólice</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Produto</TableHead>
            <TableHead className="text-right">Prêmio</TableHead>
            <TableHead>Data Cancelamento</TableHead>
            <TableHead>Motivo</TableHead>
            <TableHead>Cancelado Por</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documentos.map((documento: DocumentoCancelado) => (
            <TableRow key={documento.id}>
              <TableCell className="font-medium">
                {documento.numeroApoliceExterna || documento.numeroDocumento}
              </TableCell>
              <TableCell>{getClienteName(documento)}</TableCell>
              <TableCell>{documento.produto.nomeProduto}</TableCell>
              <TableCell className="text-right">
                {formatCurrency(documento.premioLiquido)}
              </TableCell>
              <TableCell>
                {dayjs(documento.dataCancelamento).format('DD/MM/YYYY HH:mm')}
              </TableCell>
              <TableCell>
                <Badge
                  variant="secondary"
                  className={getMotivoColor(documento.motivoCancelamento)}
                >
                  {getMotivoLabel(documento.motivoCancelamento)}
                </Badge>
              </TableCell>
              <TableCell>{documento.canceladoPor?.nome || 'Sistema'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
