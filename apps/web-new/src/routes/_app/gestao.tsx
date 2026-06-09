import { createFileRoute } from '@tanstack/react-router';
import { ModuloGuard } from '@/core/components/shared/modulo-guard';

import { useMemo, useState, lazy, Suspense } from 'react';
import { Target, Swords, Megaphone, Trophy, Plus, Pencil, Trash2, Award, Search, TrendingUp, Sparkles } from 'lucide-react';
import { Button } from '@/core/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/core/ui/tabs';
import { Badge } from '@/core/ui/badge';
import {
  Select as SelectUI,
  SelectContent as SelectContentUI,
  SelectItem as SelectItemUI,
  SelectTrigger as SelectTriggerUI,
  SelectValue as SelectValueUI,
} from '@/core/ui/select';
import { useIsMobile } from '@/core/hooks/use-mobile';
import { Progress } from '@/core/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/core/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/core/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/core/ui/alert-dialog';
import { Input } from '@/core/ui/input';
import { toast } from 'sonner';
import { Skeleton } from '@/core/ui/skeleton';
import { PageGuard } from '@/modules/auth/components/page-guard';
import { PageHeader, EmptyState } from '@/core/components/shared';
import {
  useMetasAtivas,
  useCancelGoal,
  useMissoesAtivas,
  useDeleteMission,
  useCampanhasGestao,
  useDeleteCampaign,
  useBadgesUsuario,
  useBadgeTipos,
} from '@/modules/gamificacao/http';
import { useEquipes } from '@/modules/equipes/http';
import { useUsuarios } from '@/modules/usuarios/http';
import { BadgeDisplay } from '@/modules/gamificacao/components/BadgeDisplay';

const MetaDialog = lazy(() =>
  import('@/modules/gamificacao/components/MetaDialog').then((m) => ({ default: m.MetaDialog })),
);
const MetaAuditoriaDialog = lazy(() =>
  import('@/modules/gamificacao/components/MetaAuditoriaDialog').then((m) => ({ default: m.MetaAuditoriaDialog })),
);
const CampanhaAuditoriaDialog = lazy(() =>
  import('@/modules/gamificacao/components/CampanhaAuditoriaDialog').then((m) => ({ default: m.CampanhaAuditoriaDialog })),
);
const MissaoDialog = lazy(() =>
  import('@/modules/gamificacao/components/MissaoDialog').then((m) => ({ default: m.MissaoDialog })),
);
const CampanhaDialog = lazy(() =>
  import('@/modules/gamificacao/components/CampanhaDialog').then((m) => ({ default: m.CampanhaDialog })),
);
const ConcederBadgeDialog = lazy(() =>
  import('@/modules/gamificacao/components/ConcederBadgeDialog').then((m) => ({ default: m.ConcederBadgeDialog })),
);
const BadgeGrid = lazy(() =>
  import('@/modules/gamificacao/components/BadgeGrid').then((m) => ({ default: m.BadgeGrid })),
);
import {

  getRaridadeBadge,
  getCategoriaBadge,
  CATEGORIA_LABEL,
  RARIDADE_CLASSES,
  RARIDADE_LABEL,
  RARIDADE_ORDER,
  type BadgeCategoria,
  type BadgeRaridade,
} from '@/modules/gamificacao/utils/badge-meta';

export const Route = createFileRoute('/_app/gestao')({
  component: () => <ModuloGuard modulo="gamificacao"><GestaoPage /></ModuloGuard>,
});

function GestaoPage() {
  return (
    <PageGuard permission="gamificacao:gerenciar">
      <GestaoPageContent />
    </PageGuard>
  );
}

const metricaLabels: Record<string, string> = {
  novos_seguros: 'Novos Seguros',
  renovacoes: 'Renovações',
  cotacoes: 'Cotações',
  valor_premio: 'Prêmio (R$)',
  taxa_renovacao: 'Taxa de Renovação (%)',
  premio_renovacao: 'Prêmio Renovações (R$)',
};

const statusMetaVariant: Record<string, any> = {
  ATIVA: 'default',
  CONCLUIDA: 'secondary',
  EXPIRADA: 'destructive',
  CANCELADA: 'outline',
};

const statusMissaoVariant: Record<string, any> = {
  PENDENTE: 'outline',
  EM_ANDAMENTO: 'default',
  CONCLUIDA: 'secondary',
  EXPIRADA: 'destructive',
  CANCELADA: 'outline',
};

function GestaoPageContent() {
  const { data: metas = [], isLoading: loadingMetas } = useMetasAtivas();
  const { data: missoes = [], isLoading: loadingMissoes } = useMissoesAtivas();
  const { data: campanhasData, isLoading: loadingCampanhas } = useCampanhasGestao();
  const campanhas = Array.isArray(campanhasData) ? campanhasData : (campanhasData as any)?.data ?? [];

  const { data: equipesData } = useEquipes();
  const equipes = (equipesData as any)?.data ?? [];
  const { data: usuariosData } = useUsuarios();
  const usuarios = Array.isArray(usuariosData) ? usuariosData : (usuariosData as any)?.data ?? [];

  const cancelarMeta = useCancelGoal();
  const deletarMissao = useDeleteMission();
  const deletarCampanha = useDeleteCampaign();

  const [metaDialog, setMetaDialog] = useState<{ open: boolean; meta?: any }>({ open: false });
  const [auditoriaDialog, setAuditoriaDialog] = useState<{ open: boolean; meta?: any; missao?: any }>({ open: false });
  const [campanhaAuditoriaDialog, setCampanhaAuditoriaDialog] = useState<{ open: boolean; campanha?: any }>({ open: false });
  const [missaoDialog, setMissaoDialog] = useState<{ open: boolean; missao?: any }>({ open: false });
  const [campanhaDialog, setCampanhaDialog] = useState<{ open: boolean; campanha?: any }>({ open: false });
  const [concederBadgeDialog, setConcederBadgeDialog] = useState<{ open: boolean; usuario?: any }>({ open: false });
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; action?: () => void; label?: string }>({ open: false });

  const [activeTab, setActiveTab] = useState('metas');
  const isMobile = useIsMobile();
  const [badgesUsuarioId, setBadgesUsuarioId] = useState<string>('');
  const [usuarioBusca, setUsuarioBusca] = useState('');
  const { data: badgesDoUsuario = [] } = useBadgesUsuario(badgesUsuarioId);
  const { data: badgeTipos = [], isLoading: loadingBadgeTipos } = useBadgeTipos();

  // Filtros do catálogo de badges
  const [catalogoBusca, setCatalogoBusca] = useState('');
  const [catalogoCategoria, setCatalogoCategoria] = useState<string>('todas');
  const [catalogoRaridade, setCatalogoRaridade] = useState<string>('todas');

  // Filtros de busca/status por aba
  const [metasBusca, setMetasBusca] = useState('');
  const [metasStatus, setMetasStatus] = useState<string>('todos');
  const [missoesBusca, setMissoesBusca] = useState('');
  const [missoesStatus, setMissoesStatus] = useState<string>('todos');
  const [campanhasBusca, setCampanhasBusca] = useState('');
  const [campanhasStatus, setCampanhasStatus] = useState<string>('todos');

  const metasFiltradas = useMemo(() => {
    const termo = metasBusca.trim().toLowerCase();
    return metas.filter((m: any) => {
      if (metasStatus !== 'todos' && m.status !== metasStatus) return false;
      if (termo && !m.titulo.toLowerCase().includes(termo)) return false;
      return true;
    });
  }, [metas, metasBusca, metasStatus]);

  const missoesFiltradas = useMemo(() => {
    const termo = missoesBusca.trim().toLowerCase();
    return missoes.filter((m: any) => {
      if (missoesStatus !== 'todos' && m.status !== missoesStatus) return false;
      if (termo && !m.titulo.toLowerCase().includes(termo)) return false;
      return true;
    });
  }, [missoes, missoesBusca, missoesStatus]);

  const campanhasFiltradas = useMemo(() => {
    const hoje = new Date().toISOString().split('T')[0];
    const termo = campanhasBusca.trim().toLowerCase();
    return campanhas.filter((c: any) => {
      if (termo && !c.titulo.toLowerCase().includes(termo)) return false;
      if (campanhasStatus === 'ativas') {
        return c.ativa && c.dataInicio <= hoje && c.dataFim >= hoje;
      }
      if (campanhasStatus === 'inativas') return !c.ativa;
      if (campanhasStatus === 'fora_periodo') {
        return c.ativa && (c.dataInicio > hoje || c.dataFim < hoje);
      }
      return true;
    });
  }, [campanhas, campanhasBusca, campanhasStatus]);

  const usuariosFiltrados = useMemo(() => {
    const termo = usuarioBusca.trim().toLowerCase();
    if (!termo) return usuarios;
    return usuarios.filter((u: any) => u.nome?.toLowerCase().includes(termo));
  }, [usuarios, usuarioBusca]);

  const badgeTiposFiltrados = useMemo(() => {
    const termo = catalogoBusca.trim().toLowerCase();
    return (badgeTipos as any[]).filter((b) => {
      if (termo && !b.nome.toLowerCase().includes(termo) && !b.descricao?.toLowerCase().includes(termo)) return false;
      if (catalogoCategoria !== 'todas' && getCategoriaBadge(b.slug) !== catalogoCategoria) return false;
      if (catalogoRaridade !== 'todas' && getRaridadeBadge(b.slug) !== catalogoRaridade) return false;
      return true;
    });
  }, [badgeTipos, catalogoBusca, catalogoCategoria, catalogoRaridade]);

  // KPIs
  const kpis = useMemo(() => {
    const hoje = new Date().toISOString().split('T')[0];
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    const metasAtivas = metas.filter((m: any) => m.status === 'ATIVA').length;
    const metasConcluidas = metas.filter((m: any) => m.status === 'CONCLUIDA').length;
    const totalMetasFinalizadas = metasConcluidas + metas.filter((m: any) => m.status === 'EXPIRADA').length;
    const taxaConclusao =
      totalMetasFinalizadas > 0
        ? Math.round((metasConcluidas / totalMetasFinalizadas) * 100)
        : 0;

    const missoesEmAndamento = missoes.filter(
      (m: any) => m.status === 'PENDENTE' || m.status === 'EM_ANDAMENTO',
    ).length;

    const campanhasAtivasCount = campanhas.filter(
      (c: any) => c.ativa && c.dataInicio <= hoje && c.dataFim >= hoje,
    ).length;

    return {
      metasAtivas,
      missoesEmAndamento,
      campanhasAtivas: campanhasAtivasCount,
      taxaConclusao,
    };
  }, [metas, missoes, campanhas]);

  const isAnyLoading = loadingMetas || loadingMissoes || loadingCampanhas;

  const confirmarDelete = (label: string, action: () => void) => {
    setDeleteConfirm({ open: true, label, action });
  };

  return (
    <div className="space-y-8 p-4 sm:p-6 md:p-8">
      <PageHeader
        icon={Target}
        title="Gestão de Gamificação"
        description="Gerencie metas, missões, campanhas e badges da sua equipe"
      />

      {/* KPI strip */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={Target}
          label="Metas ativas"
          value={isAnyLoading ? '—' : String(kpis.metasAtivas)}
          accent="text-blue-600 dark:text-blue-400"
          accentBg="bg-blue-100 dark:bg-blue-950"
        />
        <KpiCard
          icon={Swords}
          label="Missões em andamento"
          value={isAnyLoading ? '—' : String(kpis.missoesEmAndamento)}
          accent="text-orange-600 dark:text-orange-400"
          accentBg="bg-orange-100 dark:bg-orange-950"
        />
        <KpiCard
          icon={Megaphone}
          label="Campanhas ativas"
          value={isAnyLoading ? '—' : String(kpis.campanhasAtivas)}
          accent="text-emerald-600 dark:text-emerald-400"
          accentBg="bg-emerald-100 dark:bg-emerald-950"
        />
        <KpiCard
          icon={TrendingUp}
          label="Taxa de conclusão"
          value={isAnyLoading ? '—' : `${kpis.taxaConclusao}%`}
          accent="text-purple-600 dark:text-purple-400"
          accentBg="bg-purple-100 dark:bg-purple-950"
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {isMobile ? (
          <SelectUI value={activeTab} onValueChange={setActiveTab}>
            <SelectTriggerUI className="w-full">
              <SelectValueUI />
            </SelectTriggerUI>
            <SelectContentUI>
              <SelectItemUI value="metas">Metas ({metas.length})</SelectItemUI>
              <SelectItemUI value="missoes">Missões ({missoes.length})</SelectItemUI>
              <SelectItemUI value="campanhas">Campanhas ({campanhas.length})</SelectItemUI>
              <SelectItemUI value="badges">Badges</SelectItemUI>
            </SelectContentUI>
          </SelectUI>
        ) : (
          <TabsList className="flex w-full">
            <TabsTrigger value="metas" className="flex-1 whitespace-nowrap">
              <Target className="h-3.5 w-3.5 mr-1.5" />
              Metas ({metas.length})
            </TabsTrigger>
            <TabsTrigger value="missoes" className="flex-1 whitespace-nowrap">
              <Swords className="h-3.5 w-3.5 mr-1.5" />
              Missões ({missoes.length})
            </TabsTrigger>
            <TabsTrigger value="campanhas" className="flex-1 whitespace-nowrap">
              <Megaphone className="h-3.5 w-3.5 mr-1.5" />
              Campanhas ({campanhas.length})
            </TabsTrigger>
            <TabsTrigger value="badges" className="flex-1 whitespace-nowrap">
              <Trophy className="h-3.5 w-3.5 mr-1.5" />
              Badges
            </TabsTrigger>
          </TabsList>
        )}

        {/* ============ METAS ============ */}
        <TabsContent value="metas" className="mt-6">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por título..."
                value={metasBusca}
                onChange={(e) => setMetasBusca(e.target.value)}
                className="pl-9"
              />
            </div>
            <SelectUI value={metasStatus} onValueChange={setMetasStatus}>
              <SelectTriggerUI className="w-full sm:w-[180px]">
                <SelectValueUI placeholder="Status" />
              </SelectTriggerUI>
              <SelectContentUI>
                <SelectItemUI value="todos">Todos os status</SelectItemUI>
                <SelectItemUI value="ATIVA">Ativa</SelectItemUI>
                <SelectItemUI value="CONCLUIDA">Concluída</SelectItemUI>
                <SelectItemUI value="EXPIRADA">Expirada</SelectItemUI>
                <SelectItemUI value="CANCELADA">Cancelada</SelectItemUI>
              </SelectContentUI>
            </SelectUI>
            <Button onClick={() => setMetaDialog({ open: true })}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Meta
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead className="hidden lg:table-cell">Métrica</TableHead>
                    <TableHead>Progresso</TableHead>
                    <TableHead className="hidden md:table-cell">Período</TableHead>
                    <TableHead className="hidden md:table-cell">Escopo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingMetas ? (
                    <GestaoTableSkeleton cols={7} rows={3} />
                  ) : metasFiltradas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10">
                        <EmptyState
                          icon={Target}
                          description={
                            metas.length === 0
                              ? 'Nenhuma meta cadastrada. Crie a primeira para começar.'
                              : 'Nenhuma meta encontrada com os filtros atuais.'
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    metasFiltradas.map((meta: any) => (
                      <TableRow key={meta.id}>
                        <TableCell className="font-medium max-w-[200px] truncate">
                          {meta.titulo}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">{metricaLabels[meta.tipoMetrica]}</TableCell>
                        <TableCell className="min-w-[120px]">
                          <div className="space-y-1">
                            <Progress value={meta.percentual} className="h-2" />
                            <p className="text-xs text-muted-foreground">
                              {meta.tipoMetrica === 'taxa_renovacao'
                                ? `${meta.progressoAtual}% / ${parseFloat(meta.valorAlvo)}%`
                                : meta.tipoMetrica === 'valor_premio' || meta.tipoMetrica === 'premio_renovacao'
                                  ? `${meta.progressoAtual.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} / ${parseFloat(meta.valorAlvo).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
                                  : `${meta.progressoAtual} / ${parseFloat(meta.valorAlvo)}`
                              }{' '}({meta.percentual}%)
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap hidden md:table-cell">
                          {new Date(meta.dataInicio).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                          {' – '}
                          {new Date(meta.dataFim).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                        </TableCell>
                        <TableCell className="text-sm hidden md:table-cell">
                          {meta.equipe?.nome ?? meta.usuario?.nome ?? 'Toda a corretora'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusMetaVariant[meta.status] ?? 'outline'}>
                            {meta.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Ver vendas da meta"
                              onClick={() => setAuditoriaDialog({ open: true, meta })}
                            >
                              <Search className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setMetaDialog({ open: true, meta })}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() =>
                                confirmarDelete(`meta "${meta.titulo}"`, async () => {
                                  try {
                                    await cancelarMeta.mutateAsync(meta.id);
                                    toast.success('Meta removida');
                                  } catch {
                                    toast.error('Erro ao remover meta');
                                  }
                                })
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ MISSÕES ============ */}
        <TabsContent value="missoes" className="mt-6">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por título..."
                value={missoesBusca}
                onChange={(e) => setMissoesBusca(e.target.value)}
                className="pl-9"
              />
            </div>
            <SelectUI value={missoesStatus} onValueChange={setMissoesStatus}>
              <SelectTriggerUI className="w-full sm:w-[180px]">
                <SelectValueUI placeholder="Status" />
              </SelectTriggerUI>
              <SelectContentUI>
                <SelectItemUI value="todos">Todos os status</SelectItemUI>
                <SelectItemUI value="PENDENTE">Pendente</SelectItemUI>
                <SelectItemUI value="EM_ANDAMENTO">Em andamento</SelectItemUI>
                <SelectItemUI value="CONCLUIDA">Concluída</SelectItemUI>
                <SelectItemUI value="EXPIRADA">Expirada</SelectItemUI>
                <SelectItemUI value="CANCELADA">Cancelada</SelectItemUI>
              </SelectContentUI>
            </SelectUI>
            <Button onClick={() => setMissaoDialog({ open: true })}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Missão
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead className="hidden lg:table-cell">Métrica</TableHead>
                    <TableHead>Progresso</TableHead>
                    <TableHead className="hidden md:table-cell">Prazo</TableHead>
                    <TableHead className="hidden md:table-cell">Atribuído a</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingMissoes ? (
                    <GestaoTableSkeleton cols={7} rows={3} />
                  ) : missoesFiltradas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10">
                        <EmptyState
                          icon={Swords}
                          description={
                            missoes.length === 0
                              ? 'Nenhuma missão cadastrada. Crie uma para a sua equipe.'
                              : 'Nenhuma missão encontrada com os filtros atuais.'
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    missoesFiltradas.map((missao: any) => (
                      <TableRow key={missao.id}>
                        <TableCell className="font-medium max-w-[200px] truncate">
                          {missao.titulo}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">{metricaLabels[missao.tipoMetrica]}</TableCell>
                        <TableCell className="min-w-[120px]">
                          <div className="space-y-1">
                            <Progress value={missao.percentual} className="h-2" />
                            <p className="text-xs text-muted-foreground">
                              {missao.tipoMetrica === 'taxa_renovacao'
                                ? `${missao.progressoAtual}% / ${parseFloat(missao.valorAlvo)}%`
                                : missao.tipoMetrica === 'valor_premio' || missao.tipoMetrica === 'premio_renovacao'
                                  ? `${missao.progressoAtual.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} / ${parseFloat(missao.valorAlvo).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
                                  : `${missao.progressoAtual} / ${parseFloat(missao.valorAlvo)}`
                              }{' '}({missao.percentual}%)
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground hidden md:table-cell">
                          {new Date(missao.prazo).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell className="text-sm hidden md:table-cell">
                          {missao.equipe?.nome ?? missao.usuario?.nome ?? '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusMissaoVariant[missao.status] ?? 'outline'}>
                            {missao.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Ver vendas da missão"
                              onClick={() => setAuditoriaDialog({ open: true, missao })}
                            >
                              <Search className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setMissaoDialog({ open: true, missao })}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() =>
                                confirmarDelete(`missão "${missao.titulo}"`, async () => {
                                  try {
                                    await deletarMissao.mutateAsync(missao.id);
                                    toast.success('Missão removida');
                                  } catch {
                                    toast.error('Erro ao remover missão');
                                  }
                                })
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ CAMPANHAS ============ */}
        <TabsContent value="campanhas" className="mt-6">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por título..."
                value={campanhasBusca}
                onChange={(e) => setCampanhasBusca(e.target.value)}
                className="pl-9"
              />
            </div>
            <SelectUI value={campanhasStatus} onValueChange={setCampanhasStatus}>
              <SelectTriggerUI className="w-full sm:w-[180px]">
                <SelectValueUI placeholder="Status" />
              </SelectTriggerUI>
              <SelectContentUI>
                <SelectItemUI value="todos">Todos</SelectItemUI>
                <SelectItemUI value="ativas">Ativas (no período)</SelectItemUI>
                <SelectItemUI value="fora_periodo">Fora do período</SelectItemUI>
                <SelectItemUI value="inativas">Inativas</SelectItemUI>
              </SelectContentUI>
            </SelectUI>
            <Button onClick={() => setCampanhaDialog({ open: true })}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Campanha
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead className="hidden md:table-cell">Seguradora</TableHead>
                    <TableHead className="hidden md:table-cell">Período</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingCampanhas ? (
                    <GestaoTableSkeleton cols={5} rows={3} />
                  ) : campanhasFiltradas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-10">
                        <EmptyState
                          icon={Megaphone}
                          description={
                            campanhas.length === 0
                              ? 'Nenhuma campanha cadastrada.'
                              : 'Nenhuma campanha encontrada com os filtros atuais.'
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    campanhasFiltradas.map((campanha: any) => {
                      const hoje = new Date().toISOString().split('T')[0];
                      const isAtiva = campanha.ativa && campanha.dataInicio <= hoje && campanha.dataFim >= hoje;
                      return (
                        <TableRow key={campanha.id}>
                          <TableCell className="font-medium max-w-[200px] truncate">
                            {campanha.titulo}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground hidden md:table-cell">
                            {campanha.seguradoraParceira?.nome ?? '—'}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap hidden md:table-cell">
                            {new Date(campanha.dataInicio).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                            {' – '}
                            {new Date(campanha.dataFim).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                          </TableCell>
                          <TableCell>
                            <Badge variant={isAtiva ? 'default' : 'secondary'}>
                              {isAtiva ? 'Ativa' : campanha.ativa ? 'Fora do período' : 'Inativa'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Ver vendas da campanha"
                                onClick={() => setCampanhaAuditoriaDialog({ open: true, campanha })}
                              >
                                <Search className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setCampanhaDialog({ open: true, campanha })}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive"
                                onClick={() =>
                                  confirmarDelete(`campanha "${campanha.titulo}"`, async () => {
                                    try {
                                      await deletarCampanha.mutateAsync(campanha.id);
                                      toast.success('Campanha removida');
                                    } catch {
                                      toast.error('Erro ao remover campanha');
                                    }
                                  })
                                }
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ BADGES ============ */}
        <TabsContent value="badges" className="mt-6">
          <div className="space-y-8">

            {/* ---- Catálogo de Badges ---- */}
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Trophy className="h-4 w-4 text-yellow-500" />
                    Catálogo de Conquistas
                  </CardTitle>
                  <span className="text-xs text-muted-foreground">
                    {badgeTiposFiltrados.length} de {badgeTipos.length} badges
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Filtros */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar badge..."
                      value={catalogoBusca}
                      onChange={(e) => setCatalogoBusca(e.target.value)}
                      className="pl-9 h-9"
                    />
                  </div>
                  <SelectUI value={catalogoCategoria} onValueChange={setCatalogoCategoria}>
                    <SelectTriggerUI className="w-full sm:w-[200px] h-9">
                      <SelectValueUI placeholder="Categoria" />
                    </SelectTriggerUI>
                    <SelectContentUI>
                      <SelectItemUI value="todas">Todas as categorias</SelectItemUI>
                      {(Object.entries(CATEGORIA_LABEL) as [BadgeCategoria, string][]).map(([k, v]) => (
                        <SelectItemUI key={k} value={k}>{v}</SelectItemUI>
                      ))}
                    </SelectContentUI>
                  </SelectUI>
                  <SelectUI value={catalogoRaridade} onValueChange={setCatalogoRaridade}>
                    <SelectTriggerUI className="w-full sm:w-[160px] h-9">
                      <SelectValueUI placeholder="Raridade" />
                    </SelectTriggerUI>
                    <SelectContentUI>
                      <SelectItemUI value="todas">Todas as raridades</SelectItemUI>
                      {RARIDADE_ORDER.map((r) => (
                        <SelectItemUI key={r} value={r}>{RARIDADE_LABEL[r]}</SelectItemUI>
                      ))}
                    </SelectContentUI>
                  </SelectUI>
                </div>

                {loadingBadgeTipos ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <Skeleton key={i} className="h-28 rounded-xl" />
                    ))}
                  </div>
                ) : badgeTiposFiltrados.length === 0 ? (
                  <EmptyState icon={Trophy} description="Nenhum badge encontrado com esses filtros." />
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {badgeTiposFiltrados.map((b: any) => {
                      const raridade = getRaridadeBadge(b.slug);
                      const categoria = getCategoriaBadge(b.slug);
                      const rc = RARIDADE_CLASSES[raridade];
                      return (
                        <div
                          key={b.id}
                          className={`flex flex-col items-center gap-2 rounded-xl border p-3 text-center transition-shadow hover:shadow-md ${raridade !== 'comum' ? 'shadow-sm' : ''}`}
                        >
                          <BadgeDisplay
                            badge={{ id: b.id, badgeTipo: b }}
                            size="lg"
                          />
                          <div className="space-y-0.5 w-full">
                            <p className="text-xs font-semibold leading-tight truncate">{b.nome}</p>
                            <p className="text-[10px] text-muted-foreground leading-tight line-clamp-2">{b.descricao}</p>
                          </div>
                          <div className="flex flex-col items-center gap-0.5 mt-auto">
                            <div className="flex items-center gap-1">
                              <span className={`h-1.5 w-1.5 rounded-full ${rc.dot}`} />
                              <span className={`text-[10px] font-medium ${rc.label}`}>{RARIDADE_LABEL[raridade]}</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground/70">{CATEGORIA_LABEL[categoria]}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ---- Concessão Manual ---- */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Award className="h-4 w-4 text-primary" />
                  Conceder Badge Manualmente
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Busque um vendedor para ver suas conquistas e conceder um badge especial.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-[1fr_auto] items-end">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">
                      Buscar vendedor
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Digite o nome..."
                        value={usuarioBusca}
                        onChange={(e) => setUsuarioBusca(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <Button
                    disabled={!badgesUsuarioId}
                    onClick={() => {
                      const user = usuarios.find((u: any) => u.id === badgesUsuarioId);
                      if (user) setConcederBadgeDialog({ open: true, usuario: user });
                    }}
                  >
                    <Award className="h-4 w-4 mr-2" />
                    Conceder Badge
                  </Button>
                </div>

                {usuarioBusca.trim() && (
                  <div className="border rounded-md max-h-56 overflow-y-auto divide-y">
                    {usuariosFiltrados.length === 0 ? (
                      <p className="p-3 text-sm text-muted-foreground text-center">
                        Nenhum usuário encontrado.
                      </p>
                    ) : (
                      usuariosFiltrados.slice(0, 20).map((u: any) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => {
                            setBadgesUsuarioId(u.id);
                            setUsuarioBusca('');
                          }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors flex items-center justify-between gap-2"
                        >
                          <span className="truncate font-medium">{u.nome}</span>
                          {u.email && (
                            <span className="text-xs text-muted-foreground truncate">
                              {u.email}
                            </span>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}

                {badgesUsuarioId && (
                  <p className="text-xs text-muted-foreground">
                    Visualizando:{' '}
                    <span className="font-semibold text-foreground">
                      {usuarios.find((u: any) => u.id === badgesUsuarioId)?.nome ?? '...'}
                    </span>
                    {badgesDoUsuario.length > 0 && (
                      <span className="ml-2 text-muted-foreground">
                        · {badgesDoUsuario.length} {badgesDoUsuario.length === 1 ? 'conquista' : 'conquistas'}
                      </span>
                    )}
                  </p>
                )}
              </CardContent>
            </Card>

            {badgesUsuarioId && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-yellow-500" />
                    Conquistas de {usuarios.find((u: any) => u.id === badgesUsuarioId)?.nome}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {badgesDoUsuario.length === 0 ? (
                    <EmptyState icon={Trophy} description="Este vendedor ainda não possui badges." />
                  ) : (
                    <Suspense fallback={<Skeleton className="h-[200px] w-full rounded" />}>
                      <BadgeGrid badges={badgesDoUsuario} size="md" />
                    </Suspense>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <Suspense fallback={null}>
        <MetaDialog
          open={metaDialog.open}
          onClose={() => setMetaDialog({ open: false })}
          meta={metaDialog.meta}
          equipes={equipes}
          usuarios={usuarios}
        />

        <MetaAuditoriaDialog
          open={auditoriaDialog.open}
          onClose={() => setAuditoriaDialog({ open: false })}
          meta={auditoriaDialog.meta ?? null}
          missao={auditoriaDialog.missao ?? null}
        />

        <CampanhaAuditoriaDialog
          open={campanhaAuditoriaDialog.open}
          onClose={() => setCampanhaAuditoriaDialog({ open: false })}
          campanha={campanhaAuditoriaDialog.campanha ?? null}
        />

        <MissaoDialog
          open={missaoDialog.open}
          onClose={() => setMissaoDialog({ open: false })}
          missao={missaoDialog.missao}
          equipes={equipes}
          usuarios={usuarios}
        />

        <CampanhaDialog
          open={campanhaDialog.open}
          onClose={() => setCampanhaDialog({ open: false })}
          campanha={campanhaDialog.campanha}
        />

        <ConcederBadgeDialog
          open={concederBadgeDialog.open}
          onClose={() => setConcederBadgeDialog({ open: false })}
          usuario={concederBadgeDialog.usuario ?? null}
        />
      </Suspense>

      <AlertDialog
        open={deleteConfirm.open}
        onOpenChange={(v) => !v && setDeleteConfirm({ open: false })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar remoção</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja remover {deleteConfirm.label}? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                deleteConfirm.action?.();
                setDeleteConfirm({ open: false });
              }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface KpiCardProps {
  icon: React.ComponentType<any>;
  label: string;
  value: string;
  accent: string;
  accentBg: string;
}

function KpiCard({ icon: Icon, label, value, accent, accentBg }: KpiCardProps) {
  return (
    <Card className="border-border/50 py-0 gap-0">
      <CardContent className="px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-xs font-medium text-muted-foreground truncate">
              {label}
            </span>
            <span className="text-2xl font-bold tracking-tight tabular-nums">
              {value}
            </span>
          </div>
          <div className={`rounded-lg p-2 ring-1 ring-black/5 shrink-0 ${accentBg}`}>
            <Icon className={`h-5 w-5 ${accent}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function GestaoTableSkeleton({ cols, rows = 3 }: { cols: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: cols }).map((_, j) => (
            <TableCell key={j} className="py-4">
              <Skeleton className="h-4 w-full max-w-[140px]" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}
