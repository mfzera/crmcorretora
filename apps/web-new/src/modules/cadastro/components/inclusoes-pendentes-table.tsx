
import { useState } from 'react';
import {
  Plus,
  Eye,
  Lock,
  FileText,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/core/ui/table';
import { Button } from '@/core/ui/button';
import { Badge } from '@/core/ui/badge';
import type { DocumentoVenda } from '@/types/documento-venda';
import { DocumentoVendaDialog } from './documento-venda-dialog';
import { FinalizarCadastroDialog } from './finalizar-cadastro-dialog';
import { ReprovarCadastroDialog } from './reprovar-cadastro-dialog';
import { usePermissions } from '@/core/hooks/use-permissions';

interface InclusoesPendentesTableProps {
  vendas: DocumentoVenda[];
}

export function InclusoesPendentesTable({
  vendas,
}: InclusoesPendentesTableProps) {
  const [selectedVenda, setSelectedVenda] = useState<DocumentoVenda | null>(
    null,
  );
  const [detalhesDialogOpen, setDetalhesDialogOpen] = useState(false);
  const [finalizarDialogOpen, setFinalizarDialogOpen] = useState(false);
  const [reprovarDialogOpen, setReprovarDialogOpen] = useState(false);
  const { hasPermission } = usePermissions();
  const podeAprovar = hasPermission('cadastro:aprovar_venda');
  const podeRejeitar = hasPermission('cadastro:rejeitar_venda');

  const handleVerDetalhes = (venda: DocumentoVenda) => {
    setSelectedVenda(venda);
    setDetalhesDialogOpen(true);
  };

  if (vendas.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Plus className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="text-lg font-medium">Nenhuma inclusão aguardando cadastro</p>
        <p className="text-sm mt-1">
          As inclusões de itens solicitadas pelos vendedores aparecerão aqui
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile: cards */}
      <div className="md:hidden space-y-2">
        {vendas.map((venda) => {
          const nomeCliente =
            venda.cliente.tipoPessoa === 'PF'
              ? venda.cliente.nome
              : venda.cliente.razaoSocial;
          const metadata = venda.metadata as any;
          const ultimaInclusao = metadata?.inclusoes?.at(-1) as
            | {
                itemDescricao?: string | null;
                observacoes?: string;
                solicitadoEm?: string;
                solicitadoPorNome?: string;
                vigenciaInicio?: string | null;
                vigenciaFim?: string | null;
              }
            | undefined;
          const isLocked =
            venda.lockedById && venda.lockExpiresAt
              ? new Date(venda.lockExpiresAt) > new Date()
              : false;
          return (
            <div
              key={venda.id}
              className={`border border-border/50 rounded-lg p-3 cursor-pointer hover:bg-muted/30 transition-colors ${isLocked ? 'bg-amber-50/50 dark:bg-amber-950/10' : ''}`}
              onClick={() => handleVerDetalhes(venda)}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="font-medium text-sm truncate">{venda.numero}</span>
                    {metadata?.inclusoes?.length > 1 && (
                      <Badge variant="secondary" className="text-[10px] shrink-0">
                        {metadata.inclusoes.length} inclusões
                      </Badge>
                    )}
                  </div>
                  {isLocked && (
                    <Badge
                      variant="outline"
                      className="gap-1 bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-[10px] shrink-0"
                    >
                      <Lock className="h-3 w-3" />
                    </Badge>
                  )}
                </div>
                <div>
                  <p className="font-medium text-sm truncate">{nomeCliente}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {venda.produto.nomeProduto}
                  </p>
                </div>
                {ultimaInclusao && (
                  <div className="text-xs">
                    {ultimaInclusao.itemDescricao && (
                      <p className="font-medium truncate">{ultimaInclusao.itemDescricao}</p>
                    )}
                    {ultimaInclusao.observacoes && (
                      <p className="text-muted-foreground truncate">{ultimaInclusao.observacoes}</p>
                    )}
                  </div>
                )}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="truncate">
                    {ultimaInclusao?.solicitadoPorNome || venda.vendedor?.nome || '—'}
                  </span>
                  {ultimaInclusao?.vigenciaInicio && (
                    <span>
                      {new Date(`${ultimaInclusao.vigenciaInicio}T12:00:00Z`).toLocaleDateString('pt-BR')}
                    </span>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleVerDetalhes(venda);
                  }}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Ver Detalhes
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop: tabela */}
      <div className="hidden md:block rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Documento</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Produto Original</TableHead>
              <TableHead>Item / Observação</TableHead>
              <TableHead>Vigência</TableHead>
              <TableHead>Solicitado por</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vendas.map((venda) => {
              const nomeCliente =
                venda.cliente.tipoPessoa === 'PF'
                  ? venda.cliente.nome
                  : venda.cliente.razaoSocial;

              const metadata = venda.metadata as any;
              const ultimaInclusao = metadata?.inclusoes?.at(-1) as
                | {
                    itemDescricao?: string | null;
                    observacoes?: string;
                    solicitadoEm?: string;
                    solicitadoPorNome?: string;
                    vigenciaInicio?: string | null;
                    vigenciaFim?: string | null;
                  }
                | undefined;

              const isLocked =
                venda.lockedById && venda.lockExpiresAt
                  ? new Date(venda.lockExpiresAt) > new Date()
                  : false;

              return (
                <TableRow
                  key={venda.id}
                  className={`cursor-pointer hover:bg-muted/50 ${isLocked ? 'bg-amber-50/50 dark:bg-amber-950/10' : ''}`}
                  onClick={() => handleVerDetalhes(venda)}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p>{venda.numero}</p>
                        {metadata?.inclusoes?.length > 1 && (
                          <Badge variant="secondary" className="text-xs mt-0.5">
                            {metadata.inclusoes.length} inclusões
                          </Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{nomeCliente}</p>
                    <p className="text-xs text-muted-foreground">
                      {venda.cliente.tipoPessoa === 'PF' ? 'PF' : 'PJ'}
                    </p>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{venda.produto.nomeProduto}</p>
                    <p className="text-xs text-muted-foreground">
                      {venda.produto.tipoSeguro}
                    </p>
                  </TableCell>
                  <TableCell className="max-w-[200px]">
                    {ultimaInclusao ? (
                      <div>
                        {ultimaInclusao.itemDescricao && (
                          <p className="font-medium text-sm truncate">
                            {ultimaInclusao.itemDescricao}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground truncate">
                          {ultimaInclusao.observacoes}
                        </p>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell className="tabular-nums text-sm whitespace-nowrap">
                    {ultimaInclusao?.vigenciaInicio ? (
                      <>
                        <p>
                          {new Date(
                            `${ultimaInclusao.vigenciaInicio}T12:00:00Z`,
                          ).toLocaleDateString('pt-BR')}
                        </p>
                        {ultimaInclusao.vigenciaFim && (
                          <p className="text-xs text-muted-foreground">
                            até{' '}
                            {new Date(
                              `${ultimaInclusao.vigenciaFim}T12:00:00Z`,
                            ).toLocaleDateString('pt-BR')}
                          </p>
                        )}
                      </>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm">
                        {ultimaInclusao?.solicitadoPorNome ||
                          venda.vendedor?.nome ||
                          '—'}
                      </p>
                      {ultimaInclusao?.solicitadoEm && (
                        <p className="text-xs text-muted-foreground">
                          {new Date(
                            ultimaInclusao.solicitadoEm,
                          ).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {isLocked && (
                        <Badge
                          variant="outline"
                          className="gap-1 bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400"
                        >
                          <Lock className="h-3 w-3" />
                          {venda.lockedBy?.nome || 'Em edição'}
                        </Badge>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleVerDetalhes(venda)}
                      >
                        <Eye className="h-4 w-4 mr-1.5" />
                        Detalhes
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <DocumentoVendaDialog
        documento={selectedVenda}
        open={detalhesDialogOpen}
        onClose={() => {
          setDetalhesDialogOpen(false);
          setSelectedVenda(null);
        }}
        onFinalizarCadastro={podeAprovar ? () => {
          setDetalhesDialogOpen(false);
          setFinalizarDialogOpen(true);
        } : undefined}
        onReprovarCadastro={podeRejeitar ? () => {
          setDetalhesDialogOpen(false);
          setReprovarDialogOpen(true);
        } : undefined}
      />

      <FinalizarCadastroDialog
        venda={selectedVenda}
        open={finalizarDialogOpen}
        onClose={() => {
          setFinalizarDialogOpen(false);
          setSelectedVenda(null);
        }}
      />

      <ReprovarCadastroDialog
        documento={selectedVenda}
        open={reprovarDialogOpen}
        onClose={() => {
          setReprovarDialogOpen(false);
          setSelectedVenda(null);
        }}
        onSuccess={() => {
          setReprovarDialogOpen(false);
          setSelectedVenda(null);
        }}
      />
    </>
  );
}
