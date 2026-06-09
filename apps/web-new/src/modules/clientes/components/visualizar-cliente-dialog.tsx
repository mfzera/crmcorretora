
import { useState } from 'react';
import {
  Eye,
  User,
  Building2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  FileText,
  CreditCard,
  Shield,
} from 'lucide-react';
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
import { Separator } from '@/core/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/core/ui/card';
import type { Cliente } from '@/types/cliente';
import { getNomeCliente, getDocumentoCliente } from '@/types/cliente';
import {
  formatCPF,
  formatCNPJ,
  formatPhone,
  formatCEP,
} from '@/core/validators/documento';
import { dayjs } from '@/core/utils/date-utils';
import { useDocumentosCliente } from '@/modules/documentos-venda/http';
import { DocumentoVendaDialog } from '@/modules/cadastro/components/documento-venda-dialog';
import type { DocumentoVenda } from '@/types/documento-venda';

interface VisualizarClienteDialogProps {
  cliente: Cliente;
  trigger?: React.ReactNode;
}

export function VisualizarClienteDialog({
  cliente,
  trigger,
}: VisualizarClienteDialogProps) {
  const [documentoSelecionado, setDocumentoSelecionado] =
    useState<DocumentoVenda | null>(null);
  const { data: documentos = [], isLoading: isLoadingDocumentos } =
    useDocumentosCliente(cliente.id);

  const formatarData = (data: string | undefined) => {
    if (!data) return 'Não informado';
    try {
      const d = data.includes('T') ? dayjs(data) : dayjs(data, 'YYYY-MM-DD');
      return d.format('DD [de] MMMM [de] YYYY');
    } catch {
      return 'Data inválida';
    }
  };

  const formatarMoeda = (valor: string | number | undefined) => {
    if (!valor) return 'R$ 0,00';
    const num = typeof valor === 'string' ? parseFloat(valor) : valor;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(num);
  };

  const InfoRow = ({
    icon: Icon,
    label,
    value,
  }: {
    icon: any;
    label: string;
    value?: string | null;
  }) => {
    if (!value) return null;
    return (
      <div className="flex items-start gap-2 py-2">
        <div className="rounded-lg bg-muted p-2 mt-0.5">
          <Icon className="size-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="text-sm mt-0.5 break-words">{value}</p>
        </div>
      </div>
    );
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon">
            <Eye className="size-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2">
              <div
                className={`rounded-lg p-2 ${cliente.tipoPessoa === 'PF' ? 'bg-primary/10' : 'bg-blue-500/10'}`}
              >
                {cliente.tipoPessoa === 'PF' ? (
                  <User className="size-6 text-primary" />
                ) : (
                  <Building2 className="size-6 text-blue-500" />
                )}
              </div>
              <div>
                <DialogTitle className="text-2xl">
                  {getNomeCliente(cliente)}
                </DialogTitle>
                <DialogDescription>
                  {cliente.tipoPessoa === 'PF'
                    ? 'Pessoa Física'
                    : 'Pessoa Jurídica'}
                </DialogDescription>
              </div>
            </div>
            <Badge
              variant={cliente.ativo ? 'default' : 'secondary'}
              className="mt-1"
            >
              {cliente.ativo ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Dados Principais */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              {cliente.tipoPessoa === 'PF'
                ? 'Dados Pessoais'
                : 'Dados Empresariais'}
            </h3>
            <div className="space-y-1">
              {cliente.tipoPessoa === 'PF' ? (
                <>
                  <InfoRow
                    icon={User}
                    label="Nome Completo"
                    value={cliente.nome}
                  />
                  <InfoRow
                    icon={CreditCard}
                    label="CPF"
                    value={formatCPF(cliente.cpf!)}
                  />
                  {cliente.rg && (
                    <InfoRow icon={FileText} label="RG" value={cliente.rg} />
                  )}
                  {cliente.dataNascimento && (
                    <InfoRow
                      icon={Calendar}
                      label="Data de Nascimento"
                      value={formatarData(cliente.dataNascimento)}
                    />
                  )}
                </>
              ) : (
                <>
                  <InfoRow
                    icon={Building2}
                    label="Razão Social"
                    value={cliente.razaoSocial}
                  />
                  {cliente.nomeFantasia && (
                    <InfoRow
                      icon={Building2}
                      label="Nome Fantasia"
                      value={cliente.nomeFantasia}
                    />
                  )}
                  <InfoRow
                    icon={CreditCard}
                    label="CNPJ"
                    value={formatCNPJ(cliente.cnpj!)}
                  />
                  {cliente.inscricaoEstadual && (
                    <InfoRow
                      icon={FileText}
                      label="Inscrição Estadual"
                      value={cliente.inscricaoEstadual}
                    />
                  )}
                  {cliente.inscricaoMunicipal && (
                    <InfoRow
                      icon={FileText}
                      label="Inscrição Municipal"
                      value={cliente.inscricaoMunicipal}
                    />
                  )}
                </>
              )}
            </div>
          </div>

          <Separator />

          {/* Contato */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Informações de Contato
            </h3>
            <div className="space-y-1">
              <InfoRow icon={Mail} label="Email" value={cliente.email} />
              <InfoRow
                icon={Phone}
                label="Telefone"
                value={formatPhone(cliente.telefone)}
              />
              {cliente.celular && (
                <InfoRow
                  icon={Phone}
                  label="Celular"
                  value={formatPhone(cliente.celular)}
                />
              )}
            </div>
          </div>

          {/* Endereço */}
          {cliente.endereco && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Endereço
                </h3>
                <div className="space-y-1">
                  {cliente.endereco.cep && (
                    <InfoRow
                      icon={MapPin}
                      label="CEP"
                      value={formatCEP(cliente.endereco.cep)}
                    />
                  )}
                  {cliente.endereco.logradouro && (
                    <InfoRow
                      icon={MapPin}
                      label="Logradouro"
                      value={cliente.endereco.logradouro}
                    />
                  )}
                  {cliente.endereco.numero && (
                    <InfoRow
                      icon={MapPin}
                      label="Número"
                      value={cliente.endereco.numero}
                    />
                  )}
                  {cliente.endereco.complemento && (
                    <InfoRow
                      icon={MapPin}
                      label="Complemento"
                      value={cliente.endereco.complemento}
                    />
                  )}
                  {cliente.endereco.bairro && (
                    <InfoRow
                      icon={MapPin}
                      label="Bairro"
                      value={cliente.endereco.bairro}
                    />
                  )}
                  {cliente.endereco.cidade && cliente.endereco.estado && (
                    <InfoRow
                      icon={MapPin}
                      label="Cidade/Estado"
                      value={`${cliente.endereco.cidade} - ${cliente.endereco.estado}`}
                    />
                  )}
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Documentos Ativos */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Documentos Ativos
            </h3>
            {isLoadingDocumentos ? (
              <p className="text-sm text-muted-foreground">
                Carregando documentos...
              </p>
            ) : documentos.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum documento ativo encontrado.
              </p>
            ) : (
              <div className="space-y-2">
                {documentos.map((doc: DocumentoVenda) => (
                  <Card key={doc.id} className="overflow-hidden">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Shield className="size-4 text-primary" />
                          <div>
                            <CardTitle className="text-base">
                              {doc.numeroApoliceExterna ||
                                doc.numero ||
                                'Sem número'}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground mt-0.5">
                              {doc.produto?.nomeProduto ||
                                'Produto não especificado'}
                            </p>
                          </div>
                        </div>
                        <Badge variant="default">Ativo</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-muted-foreground">
                            Prêmio Líquido
                          </p>
                          <p className="font-semibold text-green-600">
                            {formatarMoeda(doc.premioLiquido ?? undefined)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Comissão</p>
                          <p className="font-medium">
                            {formatarMoeda(doc.valorComissao ?? undefined)} (
                            {doc.percentualComissao}%)
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">
                            Início Vigência
                          </p>
                          <p className="font-medium">
                            {doc.vigenciaInicio
                              ? formatarData(doc.vigenciaInicio)
                              : '-'}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Fim Vigência</p>
                          <p className="font-medium">
                            {doc.vigenciaFim
                              ? formatarData(doc.vigenciaFim)
                              : '-'}
                          </p>
                        </div>
                      </div>
                      <div className="pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => setDocumentoSelecionado(doc)}
                        >
                          <Eye className="mr-2 size-4" />
                          Ver Detalhes
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Dialog de Detalhes do Documento */}
          <DocumentoVendaDialog
            documento={documentoSelecionado}
            open={!!documentoSelecionado}
            onClose={() => setDocumentoSelecionado(null)}
          />

          <Separator />

          {/* Vendedor Responsável */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Vendedor Responsável
            </h3>
            <div className="space-y-1">
              <InfoRow
                icon={User}
                label="Vendedor"
                value={cliente.vendedor?.nome || 'Não informado'}
              />
              {cliente.vendedor?.email && (
                <InfoRow
                  icon={Mail}
                  label="Email do Vendedor"
                  value={cliente.vendedor.email}
                />
              )}
            </div>
          </div>

          <Separator />

          {/* Metadata */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Informações do Sistema
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Cadastrado em</p>
                <p className="font-medium">
                  {formatarData(cliente.createdAt || cliente.criadoEm)}
                </p>
              </div>
              {(cliente.updatedAt || cliente.atualizadoEm) && (
                <div>
                  <p className="text-muted-foreground">Última atualização</p>
                  <p className="font-medium">
                    {formatarData(cliente.updatedAt || cliente.atualizadoEm)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
