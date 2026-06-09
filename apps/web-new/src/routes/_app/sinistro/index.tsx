import { createFileRoute } from '@tanstack/react-router';
import { ModuloGuard } from '@/core/components/shared/modulo-guard';

import { useState, useTransition } from 'react';
import { Link } from '@tanstack/react-router';
import { Plus, KanbanSquare, AlertTriangle, Clock, CheckCircle2, XCircle, Pencil, FileText, X } from 'lucide-react';
import { Button } from '@/core/ui/button';
import { Badge } from '@/core/ui/badge';
import { Card, CardContent } from '@/core/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/core/ui/select';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/core/ui/context-menu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/core/ui/dropdown-menu';
import { MoreVertical } from 'lucide-react';
import { dayjs } from '@/core/utils/date-utils';
import { usePermissions } from '@/core/hooks/use-permissions';
import type { Sinistro, StatusSinistro } from '@/types/sinistro';
import {
  STATUS_SINISTRO_LABELS,
  TIPO_SINISTRO_LABELS,
} from '@/types/sinistro';
import { useSinistros } from '@/modules/sinistros/http';
import { DateInput } from '@/core/ui/date-input';
import { NovoSinistroDialog } from '@/modules/sinistros/components/novo-sinistro-dialog';
import { EditarSinistroDialog } from '@/modules/sinistros/components/editar-sinistro-dialog';
import { SinistroDetalheSheet } from '@/modules/sinistros/components/sinistro-detalhe-sheet';

export const Route = createFileRoute('/_app/sinistro/')({
  component: () => <ModuloGuard modulo="sinistros"><SinistroPage /></ModuloGuard>,
});


const STATUS_COLORS: Record<StatusSinistro, string> = {
  ABERTO: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  EM_ANALISE: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  AGUARDANDO_DOCUMENTOS: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  APROVADO: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  RECUSADO: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  PAGO: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  CANCELADO: 'bg-gray-100 text-gray-500 dark:bg-gray-800/50 dark:text-gray-400',
};

function SinistroPage() {
  const [filtroStatus, setFiltroStatus] = useState<StatusSinistro | ''>('');
  const [dataAberturaInicio, setDataAberturaInicio] = useState('');
  const [dataAberturaFim, setDataAberturaFim] = useState('');
  const [novoOpen, setNovoOpen] = useState(false);
  const [editarSinistro, setEditarSinistro] = useState<Sinistro | null>(null);
  const [editarOpen, setEditarOpen] = useState(false);
  const [detalhesSinistro, setDetalhesSinistro] = useState<Sinistro | null>(null);
  const [detalhesOpen, setDetalhesOpen] = useState(false);
  const [, startTransition] = useTransition();

  function handleEditar(sinistro: Sinistro) {
    setEditarSinistro(sinistro);
    setEditarOpen(true);
  }

  function handleDetalhes(sinistro: Sinistro) {
    setDetalhesSinistro(sinistro);
    setDetalhesOpen(true);
  }

  const { hasPermission } = usePermissions();
  const podeCriar = hasPermission('sinistros:criar');

  const temFiltroData = dataAberturaInicio || dataAberturaFim;

  const { data: paginado, isLoading } = useSinistros({
    status: filtroStatus || undefined,
    dataAberturaInicio: dataAberturaInicio || undefined,
    dataAberturaFim: dataAberturaFim || undefined,
    limit: 100,
  });

  const sinistros = paginado?.data ?? [];

  const stats = {
    total: sinistros.length,
    abertos: sinistros.filter((s) => s.status === 'ABERTO').length,
    emAnalise: sinistros.filter((s) => s.status === 'EM_ANALISE').length,
    aguardando: sinistros.filter((s) => s.status === 'AGUARDANDO_DOCUMENTOS').length,
    aprovados: sinistros.filter((s) => s.status === 'APROVADO').length,
    pagos: sinistros.filter((s) => s.status === 'PAGO').length,
    recusados: sinistros.filter((s) => s.status === 'RECUSADO').length,
    valorTotalReclamado: sinistros.reduce((acc, s) => acc + parseFloat(s.valorReclamado ?? '0'), 0),
    valorTotalAprovado: sinistros.reduce((acc, s) => acc + parseFloat(s.valorAprovado ?? '0'), 0),
  };
  const pendentes = stats.abertos + stats.emAnalise + stats.aguardando;
  const taxaAprovacao = stats.total > 0 ? Math.round(((stats.aprovados + stats.pagos) / stats.total) * 100) : 0;

  function fmtBRL(value: number) {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6 p-3 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-semibold">Sinistros</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Gestão de sinistros vinculados a apólices</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild className="flex-1 sm:flex-none">
            <Link to="/sinistro/kanban">
              <KanbanSquare className="h-4 w-4 mr-1.5" /> Kanban
            </Link>
          </Button>
          {podeCriar && (
            <Button size="sm" onClick={() => setNovoOpen(true)} className="flex-1 sm:flex-none">
              <Plus className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Novo sinistro</span>
              <span className="sm:hidden">Novo</span>
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Pendentes */}
        <Card>
          <CardContent className="px-4 py-3">
            <p className="text-xs text-muted-foreground">Pendentes</p>
            <div className="flex items-center justify-between mt-0.5">
              <p className="text-xl font-bold">{pendentes}</p>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <AlertTriangle className="h-3 w-3 text-blue-500" />
                  {stats.abertos} abertos
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3 text-orange-500" />
                  {stats.emAnalise} em análise
                </span>
                {stats.aguardando > 0 && (
                  <span className="text-xs text-muted-foreground">{stats.aguardando} ag. docs</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resolvidos */}
        <Card>
          <CardContent className="px-4 py-3">
            <p className="text-xs text-muted-foreground">Resolvidos</p>
            <div className="flex items-center justify-between mt-0.5">
              <div className="flex items-center gap-2">
                <p className="text-xl font-bold">{stats.aprovados + stats.pagos}</p>
                {stats.total > 0 && (
                  <span className="text-xs text-green-600 font-medium">{taxaAprovacao}% aprovação</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  {stats.aprovados} aprovados
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <XCircle className="h-3 w-3 text-red-500" />
                  {stats.recusados} recusados
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Valores */}
        <Card>
          <CardContent className="px-4 py-3">
            <p className="text-xs text-muted-foreground">Valores</p>
            <div className="flex items-center justify-between mt-0.5">
              <p className="text-xl font-bold">R$ {fmtBRL(stats.valorTotalReclamado)}</p>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                R$ {fmtBRL(stats.valorTotalAprovado)} aprovado
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros + lista */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-2">
          <Select
            value={filtroStatus || '__all__'}
            onValueChange={(v) =>
              startTransition(() => setFiltroStatus(v === '__all__' ? '' : (v as StatusSinistro)))
            }
          >
            <SelectTrigger className="w-full sm:w-[180px] h-9 sm:h-8 text-sm">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos os status</SelectItem>
              {Object.entries(STATUS_SINISTRO_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex flex-col sm:flex-row sm:items-end gap-2 sm:gap-1.5">
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground">Abertura de</p>
              <DateInput
                value={dataAberturaInicio}
                onChange={(v) => startTransition(() => setDataAberturaInicio(v))}
                showQuickSelect={false}
                className="w-full sm:w-[148px]"
              />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground">até</p>
              <DateInput
                value={dataAberturaFim}
                onChange={(v) => startTransition(() => setDataAberturaFim(v))}
                showQuickSelect={false}
                className="w-full sm:w-[148px]"
              />
            </div>
            {temFiltroData && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 sm:h-8 px-2 mb-0.5 self-start sm:self-auto"
                onClick={() => startTransition(() => { setDataAberturaInicio(''); setDataAberturaFim(''); })}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Carregando...</p>
        ) : sinistros.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Nenhum sinistro encontrado.</p>
        ) : (
          <div className="rounded-lg border divide-y">
            {sinistros.map((s) => (
              <ContextMenu key={s.id}>
                <ContextMenuTrigger asChild>
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between p-3 sm:p-4 gap-2 sm:gap-3 hover:bg-muted/30 transition-colors group cursor-default">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium truncate">{s.documentoVenda?.cliente?.nome ?? '—'}</span>
                        <span className="text-xs text-muted-foreground font-mono">{s.numeroSinistro}</span>
                        {s.numeroSinistroExterno && (
                          <span className="text-xs text-muted-foreground hidden sm:inline">· Prot. {s.numeroSinistroExterno}</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {TIPO_SINISTRO_LABELS[s.tipoSinistro]}
                        {' · '}Abertura: {dayjs(s.dataAbertura).format('DD/MM/YYYY')}
                      </p>
                      {s.descricao && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{s.descricao}</p>
                      )}
                    </div>
                    <div className="flex items-center justify-between sm:justify-start gap-2 shrink-0">
                      <div className="flex flex-col items-start sm:items-end gap-1.5">
                        <Badge className={STATUS_COLORS[s.status] ?? ''}>
                          {STATUS_SINISTRO_LABELS[s.status]}
                        </Badge>
                        {s.valorReclamado && (
                          <span className="text-xs text-muted-foreground">
                            R$ {parseFloat(s.valorReclamado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-9 w-9 sm:h-8 sm:w-8 shrink-0"
                            aria-label="Ações"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleDetalhes(s)}>
                            <FileText className="h-4 w-4 mr-2" /> Ver detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditar(s)}>
                            <Pencil className="h-4 w-4 mr-2" /> Editar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem onClick={() => handleDetalhes(s)}>
                    <FileText className="h-4 w-4 mr-2" /> Ver detalhes
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem onClick={() => handleEditar(s)}>
                    <Pencil className="h-4 w-4 mr-2" /> Editar
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            ))}
          </div>
        )}
      </div>

      <NovoSinistroDialog open={novoOpen} onOpenChange={setNovoOpen} />

      <EditarSinistroDialog
        sinistro={editarSinistro}
        open={editarOpen}
        onOpenChange={setEditarOpen}
      />

      <SinistroDetalheSheet
        sinistro={detalhesSinistro}
        open={detalhesOpen}
        onOpenChange={setDetalhesOpen}
      />
    </div>
  );
}
