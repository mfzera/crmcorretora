
import { useState, useMemo, useTransition } from 'react';
import {
  Users,
  RefreshCw,
  FileText,
  CalendarClock,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { Badge } from '@/core/ui/badge';
import { Button } from '@/core/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/core/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/core/ui/tabs';
import { useAuthStore } from '@/infra/auth/auth-store';
import type { EquipeWorkspaceData, MembroEquipe } from '../http';
import type { Cotacao } from '@/types/area-trabalho';

function getInitials(nome: string) {
  return nome
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

function getMemberColor(index: number) {
  const colors = [
    'bg-blue-500',
    'bg-emerald-500',
    'bg-violet-500',
    'bg-amber-500',
    'bg-rose-500',
    'bg-cyan-500',
    'bg-fuchsia-500',
    'bg-orange-500',
  ];
  return colors[index % colors.length];
}

interface MemberFilterProps {
  membros: MembroEquipe[];
  selectedId: string | null;
  currentUserId: string;
  onSelect: (id: string | null) => void;
  colorMap: Map<string, string>;
}

function MemberFilter({ membros, selectedId, currentUserId, onSelect, colorMap }: MemberFilterProps) {
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      <button
        onClick={() => onSelect(null)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
          selectedId === null
            ? 'bg-primary text-primary-foreground border-primary'
            : 'bg-background hover:bg-muted border-border text-muted-foreground'
        }`}
      >
        <Users className="size-3.5" />
        Todos
      </button>
      {membros.map((m) => (
        <button
          key={m.id}
          onClick={() => onSelect(selectedId === m.id ? null : m.id)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
            selectedId === m.id
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-background hover:bg-muted border-border text-muted-foreground'
          }`}
        >
          <span
            className={`inline-flex size-4 items-center justify-center rounded-full text-[10px] font-bold text-white ${colorMap.get(m.id)}`}
          >
            {getInitials(m.nome)[0]}
          </span>
          {m.id === currentUserId ? 'Você' : m.nome.split(' ')[0]}
        </button>
      ))}
    </div>
  );
}

interface OwnerBadgeProps {
  vendedor: { id: string; nome: string; avatarUrl?: string | null } | null;
  currentUserId: string;
  color: string;
}

function OwnerBadge({ vendedor, currentUserId, color }: OwnerBadgeProps) {
  if (!vendedor) return null;
  const isMe = vendedor.id === currentUserId;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold text-white ${color}`}
    >
      <Avatar className="size-3.5">
        <AvatarImage src={vendedor.avatarUrl ?? undefined} />
        <AvatarFallback className="text-[8px] bg-transparent text-white">
          {getInitials(vendedor.nome)}
        </AvatarFallback>
      </Avatar>
      {isMe ? 'Você' : vendedor.nome.split(' ')[0]}
    </span>
  );
}

function getPriorityConfig(diasParaVencimento: number) {
  if (diasParaVencimento < 0)
    return { label: 'Vencida', className: 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/20', icon: AlertTriangle, iconClass: 'text-red-500' };
  if (diasParaVencimento <= 20)
    return { label: 'Alta', className: 'border-orange-300 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20', icon: AlertTriangle, iconClass: 'text-orange-500' };
  if (diasParaVencimento <= 40)
    return { label: 'Média', className: 'border-yellow-300 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/20', icon: Clock, iconClass: 'text-yellow-500' };
  return { label: 'Normal', className: 'border-border bg-background', icon: CalendarClock, iconClass: 'text-muted-foreground' };
}

interface EquipeWorkspaceViewProps {
  data: EquipeWorkspaceData;
  onVisualizarCotacao?: (cotacao: Cotacao) => void;
  onEditarCotacao?: (cotacao: Cotacao) => void;
}

export function EquipeWorkspaceView({
  data,
  onVisualizarCotacao,
  onEditarCotacao,
}: EquipeWorkspaceViewProps) {
  const currentUserId = useAuthStore((s) => s.user?.sub ?? '');
  const [selectedMembro, setSelectedMembro] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('renovacoes');
  const [, startTransition] = useTransition();

  const colorMap = useMemo(() => {
    const map = new Map<string, string>();
    data.membros.forEach((m, i) => map.set(m.id, getMemberColor(i)));
    return map;
  }, [data.membros]);

  const renovacoesFiltradas = useMemo(() => {
    const allRenovacoes = [
      ...(data.renovacoesPendentes || []),
      ...(data.renovacoesVencidas || []),
    ];
    const list = allRenovacoes.map((r: any) => {
      const docAnterior = r.documentoVendaAnterior;
      const cliente = docAnterior?.cliente || r.cliente;
      const produto = docAnterior?.produto;
      const dias = r.dataVencimento
        ? Math.ceil(
            (new Date(r.dataVencimento).getTime() - Date.now()) /
              (1000 * 60 * 60 * 24),
          )
        : 0;
      return { ...r, _cliente: cliente, _produto: produto, _dias: dias };
    }).filter((r: any) => r._cliente);

    if (!selectedMembro) return list;
    return list.filter((r: any) => r.vendedorId === selectedMembro);
  }, [data.renovacoesPendentes, data.renovacoesVencidas, selectedMembro]);

  const cotacoesFiltradas = useMemo(() => {
    if (!selectedMembro) return data.cotacoes;
    return data.cotacoes.filter((c: any) => c.vendedorId === selectedMembro);
  }, [data.cotacoes, selectedMembro]);

  if (data.membros.length <= 1 && (data.renovacoesPendentes || []).length === 0 && (data.renovacoesVencidas || []).length === 0 && data.cotacoes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Users className="size-12 text-muted-foreground/40 mb-4" />
        <p className="text-sm font-medium text-muted-foreground">
          Você ainda não faz parte de uma equipe
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          Peça ao seu gestor para te adicionar a uma equipe
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {data.membros.length > 1 && (
        <MemberFilter
          membros={data.membros}
          selectedId={selectedMembro}
          currentUserId={currentUserId}
          onSelect={(id) => startTransition(() => setSelectedMembro(id))}
          colorMap={colorMap}
        />
      )}

      <Tabs value={activeTab} onValueChange={(v) => startTransition(() => setActiveTab(v))}>
        <TabsList className="w-full">
          <TabsTrigger value="renovacoes" className="flex-1">
            <RefreshCw className="size-3.5 mr-1.5" />
            Renovações ({renovacoesFiltradas.length})
          </TabsTrigger>
          <TabsTrigger value="cotacoes" className="flex-1">
            <FileText className="size-3.5 mr-1.5" />
            Cotações Ativas ({cotacoesFiltradas.length})
          </TabsTrigger>
        </TabsList>

        {/* Renovações da equipe */}
        <TabsContent value="renovacoes" className="mt-4">
          {renovacoesFiltradas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <RefreshCw className="size-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">
                {selectedMembro ? 'Nenhuma renovação pendente para este membro' : 'Nenhuma renovação pendente na equipe'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {renovacoesFiltradas.map((r: any) => {
                const { className, icon: Icon, iconClass } = getPriorityConfig(r._dias);
                const nomeCliente =
                  r._cliente?.tipoPessoa === 'PF'
                    ? r._cliente?.nome
                    : r._cliente?.razaoSocial;
                const color = colorMap.get(r.vendedorId) ?? 'bg-slate-500';

                return (
                  <div
                    key={r.id}
                    className={`flex items-center justify-between rounded-lg border p-3 transition-colors ${className}`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <Icon className={`size-4 mt-0.5 shrink-0 ${iconClass}`} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm truncate">
                            {nomeCliente || 'Cliente sem nome'}
                          </span>
                          <OwnerBadge
                            vendedor={r.vendedor}
                            currentUserId={currentUserId}
                            color={color}
                          />
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {r._produto?.nomeProduto || r.produtoDescricao || '—'}
                          {r.documentoVendaAnterior?.seguradoraParceira?.nomeFantasia && (
                            <span className="ml-2">
                              · {r.documentoVendaAnterior.seguradoraParceira.nomeFantasia}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <div className="text-xs font-medium">
                        {r._dias < 0
                          ? `${Math.abs(r._dias)}d vencida`
                          : r._dias === 0
                            ? 'Vence hoje'
                            : `${r._dias}d`}
                      </div>
                      {r.dataVencimento && (
                        <div className="text-xs text-muted-foreground">
                          {new Date(r.dataVencimento + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Cotações Ativas da equipe */}
        <TabsContent value="cotacoes" className="mt-4">
          {cotacoesFiltradas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="size-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">
                {selectedMembro ? 'Nenhuma cotação ativa para este membro' : 'Nenhuma cotação ativa na equipe'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {cotacoesFiltradas.map((c: any) => {
                const nomeCliente =
                  c.cliente?.tipoPessoa === 'PF'
                    ? c.cliente?.nome
                    : c.cliente?.razaoSocial;
                const color = colorMap.get(c.vendedorId) ?? 'bg-slate-500';

                return (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-background p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <FileText className="size-4 mt-0.5 shrink-0 text-blue-500" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm truncate">
                            {nomeCliente || 'Cliente sem nome'}
                          </span>
                          <OwnerBadge
                            vendedor={c.vendedor}
                            currentUserId={currentUserId}
                            color={color}
                          />
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {c.produto?.nomeProduto || '—'}
                          {c.seguradoraParceira?.nomeFantasia && (
                            <span className="ml-2">
                              · {c.seguradoraParceira.nomeFantasia}
                            </span>
                          )}
                          {c.numeroCotacao && (
                            <span className="ml-2 font-mono">#{c.numeroCotacao}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      {c.premioLiquido && (
                        <span className="text-xs font-medium text-right">
                          {Number(c.premioLiquido).toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          })}
                        </span>
                      )}
                      {onVisualizarCotacao && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          onClick={() => onVisualizarCotacao(c)}
                        >
                          Ver
                        </Button>
                      )}
                      {onEditarCotacao && c.vendedorId === currentUserId && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs"
                          onClick={() => onEditarCotacao(c)}
                        >
                          Editar
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
