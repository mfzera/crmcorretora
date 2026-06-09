
import {
  DollarSign,
  Percent,
  Kanban,
  Users,
  RefreshCw,
  FileEdit,
  TrendingUp,
} from 'lucide-react';
import { MetricaCard } from './metrica-card';
import { MetricasResumo } from '../http';

type MetricasCardsProps = {
  metricas?: MetricasResumo;
  isLoading?: boolean;
  onCardClick?: (categoria: string) => void;
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-1 h-3.5 rounded-full bg-primary" />
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {children}
      </h3>
    </div>
  );
}

export function MetricasCards({
  metricas,
  isLoading,
  onCardClick,
}: MetricasCardsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Seção: Prêmio Líquido */}
      <div>
        <SectionTitle>Prêmio Líquido</SectionTitle>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricaCard
            titulo="Total em Prêmios"
            valor={
              metricas
                ? formatCurrency(metricas.premioLiquido.resumo.total)
                : 'R$ 0,00'
            }
            subtitulo={`${metricas?.premioLiquido.resumo.count || 0} documentos`}
            icone={DollarSign}
            corIcone="text-green-600"
            isLoading={isLoading}
            onClick={() => onCardClick?.('premio_liquido')}
          />
          <MetricaCard
            titulo="Prêmio Médio"
            valor={
              metricas
                ? formatCurrency(metricas.premioLiquido.resumo.media)
                : 'R$ 0,00'
            }
            subtitulo="Por documento"
            icone={TrendingUp}
            corIcone="text-blue-600"
            isLoading={isLoading}
          />
          <MetricaCard
            titulo="Maior Prêmio"
            valor={
              metricas
                ? formatCurrency(metricas.premioLiquido.resumo.maior)
                : 'R$ 0,00'
            }
            icone={DollarSign}
            corIcone="text-emerald-600"
            isLoading={isLoading}
          />
          <MetricaCard
            titulo="Menor Prêmio"
            valor={
              metricas
                ? formatCurrency(metricas.premioLiquido.resumo.menor)
                : 'R$ 0,00'
            }
            icone={DollarSign}
            corIcone="text-gray-600"
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Seção: Comissão */}
      <div>
        <SectionTitle>Comissões</SectionTitle>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <MetricaCard
            titulo="Total em Comissões"
            valor={
              metricas
                ? formatCurrency(metricas.comissao.resumo.totalComissao)
                : 'R$ 0,00'
            }
            icone={Percent}
            corIcone="text-purple-600"
            isLoading={isLoading}
            onClick={() => onCardClick?.('comissao')}
          />
          <MetricaCard
            titulo="Comissão Média"
            valor={
              metricas
                ? formatCurrency(metricas.comissao.resumo.mediaComissao)
                : 'R$ 0,00'
            }
            subtitulo="Por documento"
            icone={TrendingUp}
            corIcone="text-indigo-600"
            isLoading={isLoading}
          />
          <MetricaCard
            titulo="Negócios Corretora"
            valor={
              metricas
                ? formatCurrency(metricas.comissao.resumo.totalCorretora)
                : 'R$ 0,00'
            }
            subtitulo={`${metricas?.comissao.resumo.countNegocioCorretora || 0} documentos compartilhados`}
            icone={Users}
            corIcone="text-orange-600"
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Seção: Kanban */}
      <div>
        <SectionTitle>Pipeline (Kanban)</SectionTitle>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricaCard
            titulo="Total de Oportunidades"
            valor={
              metricas
                ? metricas.kanban.porStatus.reduce(
                    (acc, s) => acc + Number(s.count),
                    0,
                  )
                : 0
            }
            subtitulo={`Prêmio estimado: ${
              metricas
                ? formatCurrency(
                    metricas.kanban.porStatus.reduce(
                      (acc, s) => acc + Number(s.premioEstimado),
                      0,
                    ),
                  )
                : 'R$ 0,00'
            }`}
            icone={Kanban}
            corIcone="text-cyan-600"
            isLoading={isLoading}
            onClick={() => onCardClick?.('status_kanban')}
          />
          <MetricaCard
            titulo="Urgentes"
            valor={
              metricas
                ? metricas.kanban.porPrioridade.find((p) => p.prioridade === 'urgente')
                    ?.count || 0
                : 0
            }
            subtitulo="Prioridade urgente"
            icone={Kanban}
            corIcone="text-red-600"
            isLoading={isLoading}
          />
          <MetricaCard
            titulo="Leads Quentes"
            valor={
              metricas
                ? metricas.kanban.porTemperatura.find((t) => t.temperatura === 'quente')
                    ?.count || 0
                : 0
            }
            subtitulo="Alta chance de conversão"
            icone={TrendingUp}
            corIcone="text-orange-600"
            isLoading={isLoading}
          />
          <MetricaCard
            titulo="Leads Frios"
            valor={
              metricas
                ? metricas.kanban.porTemperatura.find((t) => t.temperatura === 'frio')
                    ?.count || 0
                : 0
            }
            subtitulo="Requerem atenção"
            icone={Kanban}
            corIcone="text-blue-400"
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Seção: Cadastros */}
      <div>
        <SectionTitle>Cadastros de Clientes</SectionTitle>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricaCard
            titulo="Total de Clientes"
            valor={metricas?.cadastro.totalClientes || 0}
            icone={Users}
            corIcone="text-teal-600"
            isLoading={isLoading}
            onClick={() => onCardClick?.('cadastro')}
          />
          <MetricaCard
            titulo="Clientes Ativos"
            valor={metricas?.cadastro.clientesAtivos || 0}
            subtitulo={`${
              metricas
                ? (
                    (metricas.cadastro.clientesAtivos /
                      (metricas.cadastro.totalClientes || 1)) *
                    100
                  ).toFixed(1)
                : 0
            }% do total`}
            icone={Users}
            corIcone="text-green-600"
            isLoading={isLoading}
          />
          <MetricaCard
            titulo="Pessoa Física"
            valor={metricas?.cadastro.clientesPF || 0}
            subtitulo="Clientes PF"
            icone={Users}
            corIcone="text-blue-600"
            isLoading={isLoading}
          />
          <MetricaCard
            titulo="Pessoa Jurídica"
            valor={metricas?.cadastro.clientesPJ || 0}
            subtitulo="Clientes PJ"
            icone={Users}
            corIcone="text-purple-600"
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Seção: Renovações */}
      <div>
        <SectionTitle>Renovações</SectionTitle>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricaCard
            titulo="Total de Renovações"
            valor={metricas?.renovacao.resumo.total || 0}
            icone={RefreshCw}
            corIcone="text-violet-600"
            isLoading={isLoading}
            onClick={() => onCardClick?.('renovacao')}
          />
          <MetricaCard
            titulo="Renovadas"
            valor={metricas?.renovacao.resumo.renovados || 0}
            subtitulo={`Taxa: ${
              metricas
                ? (
                    (metricas.renovacao.resumo.renovados /
                      (metricas.renovacao.resumo.total || 1)) *
                    100
                  ).toFixed(1)
                : 0
            }%`}
            icone={RefreshCw}
            corIcone="text-green-600"
            isLoading={isLoading}
          />
          <MetricaCard
            titulo="Em Andamento"
            valor={metricas?.renovacao.resumo.emAndamento || 0}
            subtitulo="Requerem ação"
            icone={RefreshCw}
            corIcone="text-yellow-600"
            isLoading={isLoading}
          />
          <MetricaCard
            titulo="Perdidas"
            valor={metricas?.renovacao.resumo.perdidos || 0}
            subtitulo="Não renovadas"
            icone={RefreshCw}
            corIcone="text-red-600"
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Seção: Endossos */}
      <div>
        <SectionTitle>Endossos</SectionTitle>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricaCard
            titulo="Total de Endossos"
            valor={metricas?.endosso.resumo.total || 0}
            icone={FileEdit}
            corIcone="text-amber-600"
            isLoading={isLoading}
            onClick={() => onCardClick?.('endosso')}
          />
          <MetricaCard
            titulo="Aprovados"
            valor={metricas?.endosso.resumo.aprovados || 0}
            subtitulo={`Taxa: ${
              metricas
                ? (
                    (metricas.endosso.resumo.aprovados /
                      (metricas.endosso.resumo.total || 1)) *
                    100
                  ).toFixed(1)
                : 0
            }%`}
            icone={FileEdit}
            corIcone="text-green-600"
            isLoading={isLoading}
          />
          <MetricaCard
            titulo="Aguardando"
            valor={metricas?.endosso.resumo.solicitados || 0}
            subtitulo="Pendentes"
            icone={FileEdit}
            corIcone="text-yellow-600"
            isLoading={isLoading}
          />
          <MetricaCard
            titulo="Recusados"
            valor={metricas?.endosso.resumo.recusados || 0}
            icone={FileEdit}
            corIcone="text-red-600"
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}
