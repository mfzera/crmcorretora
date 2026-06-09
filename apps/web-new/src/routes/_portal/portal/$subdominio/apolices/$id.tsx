import { createFileRoute } from '@tanstack/react-router';

import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import {
  ChevronLeft,
  Phone,
  Mail,
  Building2,
  Shield,
  User,
  MessageSquare,
  FileDown,
  Clock,
  Headphones,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/core/ui/card';
import { Separator } from '@/core/ui/separator';
import { Button } from '@/core/ui/button';
import { toast } from 'sonner';
import {
  getPortalApolice,
  getPortalDocumentos,
  getPortalDocumentoDownload,
  type ApoliceDetalhe,
  type DocumentoApoliceItem,
} from '@/infra/http/portal-api';
import { formatDateFull as formatDate, getStatusBadge, getTipoSeguroLabel } from '@/modules/portal/utils/portal-utils';

export const Route = createFileRoute('/_portal/portal/$subdominio/apolices/$id')({
  component: PortalApoliceDetalhePage,
});


function formatBytes(bytes: number | null) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function buildWhatsappUrl(numero: string, mensagem?: string) {
  const num = numero.replace(/\D/g, '');
  const msg = mensagem ? encodeURIComponent(mensagem) : '';
  return `https://wa.me/55${num}${msg ? `?text=${msg}` : ''}`;
}

function PortalApoliceDetalhePage() {
  const params = Route.useParams();
  const [apolice, setApolice] = useState<ApoliceDetalhe | null>(null);
  const [documentos, setDocumentos] = useState<DocumentoApoliceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getPortalApolice(params.id),
      getPortalDocumentos(params.id).catch(() => []),
    ])
      .then(([ap, docs]) => {
        setApolice(ap);
        setDocumentos(docs);
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [params.id]);

  async function handleDownload(doc: DocumentoApoliceItem) {
    setDownloadingId(doc.id);
    try {
      const { url } = await getPortalDocumentoDownload(doc.id);
      window.open(url, '_blank');
    } catch {
      toast.error('Erro ao baixar o documento');
    } finally {
      setDownloadingId(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-32 animate-pulse rounded bg-muted" />
        <div className="h-40 animate-pulse rounded-lg bg-muted" />
        <div className="h-40 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (!apolice) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Apólice não encontrada.</p>
        <Link
          to="/portal/$subdominio/apolices" params={{ subdominio: params.subdominio }}
          className="mt-2 inline-block text-sm text-primary hover:underline"
        >
          Voltar para apólices
        </Link>
      </div>
    );
  }

  const badge = getStatusBadge(apolice.diasParaVencer);
  const coberturas = Array.isArray(apolice.coberturas)
    ? apolice.coberturas
    : apolice.coberturas
    ? [apolice.coberturas]
    : [];

  return (
    <div className="space-y-5">
      {/* Voltar */}
      <Link
        to="/portal/$subdominio/apolices" params={{ subdominio: params.subdominio }}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Minhas Apólices
      </Link>

      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{apolice.produto.nomeProduto}</h1>
          <p className="text-sm text-muted-foreground">
            {getTipoSeguroLabel(apolice.produto.tipoSeguro)}
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}
        >
          {badge.label}
        </span>
      </div>

      {/* Dados da apólice */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Shield className="h-4 w-4" />
            Dados da cobertura
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm">
          {apolice.numeroApoliceExterna && (
            <div>
              <p className="text-xs text-muted-foreground">Nº Apólice</p>
              <p className="font-medium">{apolice.numeroApoliceExterna}</p>
            </div>
          )}
          {apolice.numeroPropostaExterna && (
            <div>
              <p className="text-xs text-muted-foreground">Nº Proposta</p>
              <p className="font-medium">{apolice.numeroPropostaExterna}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-muted-foreground">Vigência início</p>
            <p className="font-medium">{formatDate(apolice.vigenciaInicio)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Vigência fim</p>
            <p className="font-medium">{formatDate(apolice.vigenciaFim)}</p>
          </div>
          {apolice.valorSegurado && (
            <div>
              <p className="text-xs text-muted-foreground">Valor segurado</p>
              <p className="font-medium">
                {Number(apolice.valorSegurado).toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                })}
              </p>
            </div>
          )}
          {apolice.franquia && (
            <div>
              <p className="text-xs text-muted-foreground">Franquia</p>
              <p className="font-medium">
                {Number(apolice.franquia).toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                })}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Coberturas */}
      {coberturas.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Coberturas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {coberturas.map((c: any, i: number) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{typeof c === 'string' ? c : c.descricao ?? c.nome ?? JSON.stringify(c)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Documentos */}
      {documentos.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <FileDown className="h-4 w-4" />
              Documentos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {documentos.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between gap-3 rounded-md border p-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{doc.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    {doc.tipo}
                    {doc.tamanhoBytes ? ` · ${formatBytes(doc.tamanhoBytes)}` : ''}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDownload(doc)}
                  disabled={downloadingId === doc.id}
                  className="shrink-0 gap-1.5"
                >
                  <FileDown className="h-3.5 w-3.5" />
                  {downloadingId === doc.id ? 'Baixando...' : 'Baixar'}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Contato da seguradora */}
      {apolice.seguradora && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4" />
              Seguradora
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="font-medium text-sm">
              {apolice.seguradora.nomeFantasia ?? apolice.seguradora.razaoSocial}
            </p>
            {(apolice.seguradora.telefone || apolice.seguradora.email) && (
              <>
                <Separator />
                <div className="space-y-2">
                  {apolice.seguradora.telefone && (
                    <a
                      href={`tel:${apolice.seguradora.telefone}`}
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <Phone className="h-4 w-4" />
                      {apolice.seguradora.telefone}
                    </a>
                  )}
                  {apolice.seguradora.email && (
                    <a
                      href={`mailto:${apolice.seguradora.email}`}
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <Mail className="h-4 w-4" />
                      {apolice.seguradora.email}
                    </a>
                  )}
                </div>
              </>
            )}

            {/* Suporte 24h */}
            {(apolice.seguradora.telefone24h || apolice.seguradora.whatsapp24h) && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Headphones className="h-3.5 w-3.5" />
                    Suporte 24h
                    {apolice.seguradora.horarioAtendimento24h && (
                      <span className="ml-1 flex items-center gap-0.5">
                        <Clock className="h-3 w-3" />
                        {apolice.seguradora.horarioAtendimento24h}
                      </span>
                    )}
                  </p>
                  {apolice.seguradora.telefone24h && (
                    <a
                      href={`tel:${apolice.seguradora.telefone24h}`}
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <Phone className="h-4 w-4" />
                      {apolice.seguradora.telefone24h}
                    </a>
                  )}
                  {apolice.seguradora.whatsapp24h && (
                    <a
                      href={buildWhatsappUrl(apolice.seguradora.whatsapp24h)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-green-600 hover:underline"
                    >
                      <MessageSquare className="h-4 w-4" />
                      WhatsApp 24h: {apolice.seguradora.whatsapp24h}
                    </a>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Contato do corretor responsável */}
      {apolice.vendedor && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4" />
              Corretor Responsável
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm font-medium">{apolice.vendedor.nome ?? 'Corretor'}</p>
            <div className="space-y-2">
              {apolice.vendedor.telefone && (
                <a
                  href={buildWhatsappUrl(
                    apolice.vendedor.telefone,
                    `Olá, tenho uma dúvida sobre minha apólice ${apolice.numeroApoliceExterna ?? apolice.numeroDocumento}`,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-green-600 hover:underline"
                >
                  <MessageSquare className="h-4 w-4" />
                  WhatsApp: {apolice.vendedor.telefone}
                </a>
              )}
              {apolice.vendedor.email && (
                <a
                  href={`mailto:${apolice.vendedor.email}`}
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <Mail className="h-4 w-4" />
                  {apolice.vendedor.email}
                </a>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Observações */}
      {apolice.observacoes && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{apolice.observacoes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
