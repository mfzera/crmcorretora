
import { toast } from 'sonner';
import { handleApiError } from '@/core/utils/handle-api-error';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/core/ui/card';
import { Button } from '@/core/ui/button';
import { Badge } from '@/core/ui/badge';
import { Separator } from '@/core/ui/separator';
import {
  AlertTriangle,
  Send,
  Clock,
  User,
  Package,
  Building2,
} from 'lucide-react';
import {
  useDocumentosVendaConfirmados,
  useSolicitarValidacaoCadastro,
} from '../http';
import type { DocumentoVenda } from '@/types/documento-venda';

export function VendasAguardandoCadastroCard() {
  const { data: documentos = [], isLoading } = useDocumentosVendaConfirmados();
  const solicitarMutation = useSolicitarValidacaoCadastro();

  if (isLoading || documentos.length === 0) return null;

  const handleEnviarCadastro = async (doc: DocumentoVenda) => {
    try {
      await solicitarMutation.mutateAsync(doc.id);
      toast.success('Enviado para o cadastro!', {
        description: `Documento ${doc.numero} enviado para validação.`,
      });
    } catch (error) {
      toast.error(handleApiError(error));
    }
  };

  const rejeitados = documentos.filter((d: DocumentoVenda) => d.motivoRejeicao);
  const pendentes = documentos.filter((d: DocumentoVenda) => !d.motivoRejeicao);

  return (
    <Card className="border-orange-200 bg-orange-50/50 dark:border-orange-500/30 dark:bg-orange-950/20">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          Vendas Aguardando Envio ao Cadastro
          <Badge variant="secondary" className="ml-auto">
            {documentos.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Rejeitados primeiro — mais urgentes */}
        {rejeitados.map((doc: DocumentoVenda) => (
          <DocumentoCard
            key={doc.id}
            doc={doc}
            isRejeitado
            onEnviar={handleEnviarCadastro}
            isPending={solicitarMutation.isPending}
          />
        ))}

        {rejeitados.length > 0 && pendentes.length > 0 && <Separator />}

        {/* Pendentes de primeiro envio */}
        {pendentes.map((doc: DocumentoVenda) => (
          <DocumentoCard
            key={doc.id}
            doc={doc}
            isRejeitado={false}
            onEnviar={handleEnviarCadastro}
            isPending={solicitarMutation.isPending}
          />
        ))}
      </CardContent>
    </Card>
  );
}

interface DocumentoCardProps {
  doc: DocumentoVenda;
  isRejeitado: boolean;
  onEnviar: (doc: DocumentoVenda) => void;
  isPending: boolean;
}

function DocumentoCard({ doc, isRejeitado, onEnviar, isPending }: DocumentoCardProps) {
  const nomeCliente =
    doc.cliente.tipoPessoa === 'PF'
      ? doc.cliente.nome
      : doc.cliente.razaoSocial;

  return (
    <div
      className={`p-4 rounded-lg border space-y-3 bg-white dark:bg-card ${
        isRejeitado
          ? 'border-red-200 dark:border-red-800'
          : 'border-border dark:border-border'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm font-medium">{doc.numero}</span>
            {isRejeitado ? (
              <Badge variant="destructive" className="text-xs">
                Cadastro Rejeitado
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                Aguardando Envio
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <User className="h-3.5 w-3.5" />
            <span>{nomeCliente}</span>
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {doc.produto?.nomeProduto && (
              <span className="flex items-center gap-1">
                <Package className="h-3 w-3" />
                {doc.produto.nomeProduto}
              </span>
            )}
            {doc.seguradoraParceira && (
              <span className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {doc.seguradoraParceira.nomeFantasia || doc.seguradoraParceira.razaoSocial}
              </span>
            )}
          </div>
        </div>

        {doc.premioLiquido && (
          <span className="text-sm font-semibold text-green-700 dark:text-green-400 shrink-0">
            {Number(doc.premioLiquido).toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            })}
          </span>
        )}
      </div>

      {/* Motivo da rejeição */}
      {isRejeitado && doc.motivoRejeicao && (
        <div className="rounded-md border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30 p-3">
          <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-1 flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5" />
            Motivo da Rejeição
          </p>
          <p className="text-sm text-red-800 dark:text-red-300 leading-relaxed">
            {doc.motivoRejeicao}
          </p>
          {doc.rejeitadoPor && (
            <p className="text-xs text-red-600 dark:text-red-500 mt-1">
              Reprovado por: {doc.rejeitadoPor.nome}
            </p>
          )}
        </div>
      )}

      <div className="flex justify-end pt-1">
        <Button
          size="sm"
          onClick={() => onEnviar(doc)}
          disabled={isPending}
          className={isRejeitado ? 'bg-orange-600 hover:bg-orange-700' : ''}
        >
          {isRejeitado ? (
            <>
              <Send className="h-4 w-4 mr-2" />
              Reenviar para Cadastro
            </>
          ) : (
            <>
              <Clock className="h-4 w-4 mr-2" />
              Enviar para Cadastro
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
