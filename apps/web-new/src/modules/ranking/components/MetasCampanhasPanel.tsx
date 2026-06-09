import { useState } from 'react';
import { Target, Megaphone, CalendarDays, TrendingUp, FlaskConical, LayoutGrid, CheckCircle2, Clock } from 'lucide-react';
import { cn } from '@/core/utils';
import { formatDateBR } from '@/core/utils/date-utils';

const metricaLabel: Record<string, string> = {
  novos_seguros: 'Novos Seguros',
  renovacoes: 'Renovações',
  cotacoes: 'Cotações',
  valor_premio: 'Prêmio',
  taxa_renovacao: 'Taxa Renovação',
  premio_renovacao: 'Prêmio Renovações',
};

function formatAlvo(tipoMetrica: string, valorAlvo: number) {
  if (tipoMetrica === 'valor_premio' || tipoMetrica === 'premio_renovacao') {
    return valorAlvo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  }
  if (tipoMetrica === 'taxa_renovacao') {
    return `${valorAlvo}% de Renovação`;
  }
  return `${Math.round(valorAlvo)} ${metricaLabel[tipoMetrica] ?? tipoMetrica}`;
}

interface MetaItem {
  id: string;
  titulo: string;
  tipoMetrica: string;
  valorAlvo: number;
  dataFim: string;
  status: string;
}

interface CampanhaItem {
  id: string;
  titulo: string;
  dataInicio: string;
  dataFim: string;
  seguradoraParceira?: { nomeFantasia?: string; razaoSocial?: string } | null;
}

interface TesteItem {
  id: string;
  titulo: string;
  descricao: string;
  status: 'em_andamento' | 'concluido' | 'planejado';
  dataFim: string;
}

interface OutroItem {
  id: string;
  titulo: string;
  tipo: string;
  data: string;
}

// ── Mock data ────────────────────────────────────────────────────────────────

const MOCK_METAS: MetaItem[] = [
  { id: 'm1', titulo: 'Meta Junho: Novos Seguros', tipoMetrica: 'novos_seguros', valorAlvo: 50, dataFim: '2026-06-30', status: 'ATIVA' },
  { id: 'm2', titulo: 'Prêmio Q2 – Toda Equipe', tipoMetrica: 'valor_premio', valorAlvo: 200000, dataFim: '2026-06-30', status: 'ATIVA' },
  { id: 'm3', titulo: 'Taxa Renovação Junho', tipoMetrica: 'taxa_renovacao', valorAlvo: 80, dataFim: '2026-06-30', status: 'ATIVA' },
];

const MOCK_CAMPANHAS: CampanhaItem[] = [
  { id: 'c1', titulo: 'Porto Seguro – Auto Verão', dataInicio: '2026-06-01', dataFim: '2026-06-30', seguradoraParceira: { nomeFantasia: 'Porto Seguro' } },
  { id: 'c2', titulo: 'Allianz Performance Q2', dataInicio: '2026-04-01', dataFim: '2026-06-30', seguradoraParceira: { nomeFantasia: 'Allianz' } },
  { id: 'c3', titulo: 'Bradesco Vida – Captação', dataInicio: '2026-05-15', dataFim: '2026-07-31', seguradoraParceira: { nomeFantasia: 'Bradesco Seguros' } },
];

const MOCK_TESTES: TesteItem[] = [
  { id: 't1', titulo: 'Piloto: Seguro Vida Digital', descricao: 'Captação via canal 100% digital', status: 'em_andamento', dataFim: '2026-07-15' },
  { id: 't2', titulo: 'A/B: Cotação Rápida', descricao: 'Funil curto vs. funil completo', status: 'em_andamento', dataFim: '2026-06-30' },
  { id: 't3', titulo: 'NPS Pós-Venda Automático', descricao: 'Survey 30 dias após contratação', status: 'planejado', dataFim: '2026-08-01' },
];

const MOCK_OUTROS: OutroItem[] = [
  { id: 'o1', titulo: 'Treinamento Bradesco Saúde', tipo: 'Treinamento', data: '2026-06-10' },
  { id: 'o2', titulo: 'Visita Comercial Porto Seguro', tipo: 'Reunião', data: '2026-06-15' },
  { id: 'o3', titulo: 'Webinar Tendências Seguros 2026', tipo: 'Evento', data: '2026-06-20' },
  { id: 'o4', titulo: 'Revisão Tabela Comissões', tipo: 'Interno', data: '2026-06-25' },
];

// ── Panel ────────────────────────────────────────────────────────────────────

type Aba = 'metas' | 'campanhas' | 'testes' | 'outros';

const abas: { key: Aba; label: string; icon: React.FC<{ className?: string }> }[] = [
  { key: 'metas', label: 'Metas', icon: Target },
  { key: 'campanhas', label: 'Campanhas', icon: Megaphone },
  { key: 'testes', label: 'Testes', icon: FlaskConical },
  { key: 'outros', label: 'Outros', icon: LayoutGrid },
];

interface MetasCampanhasPanelProps {
  metas: MetaItem[];
  campanhas: CampanhaItem[];
}

export function MetasCampanhasPanel({ metas, campanhas }: MetasCampanhasPanelProps) {
  const [aba, setAba] = useState<Aba>('metas');

  const metasAtivas = metas.filter((m) => m.status === 'ATIVA').slice(0, 3);
  const campanhasAtivas = campanhas.slice(0, 3);

  const metasExibidas = metasAtivas.length > 0 ? metasAtivas : MOCK_METAS;
  const campanhasExibidas = campanhasAtivas.length > 0 ? campanhasAtivas : MOCK_CAMPANHAS;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Abas */}
      <div className="flex border-b border-white/8 shrink-0">
        {abas.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setAba(key)}
            className={cn(
              'flex items-center gap-1 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider transition-colors flex-1 justify-center',
              aba === key
                ? 'text-white border-b-2 border-white/50 -mb-px'
                : 'text-white/30 hover:text-white/55',
            )}
          >
            <Icon className="h-3 w-3" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        {aba === 'metas' && (
          <>
            {metasExibidas.map((meta) => (
              <MetaCard key={meta.id} meta={meta} isMock={metasAtivas.length === 0} />
            ))}
          </>
        )}

        {aba === 'campanhas' && (
          <>
            {campanhasExibidas.map((c) => (
              <CampanhaCard key={c.id} campanha={c} isMock={campanhasAtivas.length === 0} />
            ))}
          </>
        )}

        {aba === 'testes' && (
          <>
            {MOCK_TESTES.map((t) => (
              <TesteCard key={t.id} teste={t} />
            ))}
          </>
        )}

        {aba === 'outros' && (
          <>
            {MOCK_OUTROS.map((o) => (
              <OutroCard key={o.id} outro={o} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

// ── Cards ────────────────────────────────────────────────────────────────────

function MockBadge() {
  return (
    <span className="text-[8px] font-bold uppercase tracking-widest text-yellow-500/60 border border-yellow-500/20 rounded px-1 py-0.5 leading-none shrink-0">
      mock
    </span>
  );
}

function MetaCard({ meta, isMock }: { meta: MetaItem; isMock?: boolean }) {
  return (
    <div className="rounded-xl bg-white/[0.06] border border-white/8 px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-white font-semibold text-sm leading-tight truncate">{meta.titulo}</p>
        {isMock && <MockBadge />}
      </div>
      <div className="flex items-center justify-between mt-1.5 gap-2">
        <div className="flex items-center gap-1">
          <TrendingUp className="h-2.5 w-2.5 text-green-400 shrink-0" />
          <span className="text-green-400 text-[11px] font-medium">
            {formatAlvo(meta.tipoMetrica, meta.valorAlvo)}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <CalendarDays className="h-2.5 w-2.5 text-white/25" />
          <span className="text-white/35 text-[10px]">até {formatDateBR(meta.dataFim)}</span>
        </div>
      </div>
    </div>
  );
}

function CampanhaCard({ campanha, isMock }: { campanha: CampanhaItem; isMock?: boolean }) {
  const seguradora =
    campanha.seguradoraParceira?.nomeFantasia ||
    campanha.seguradoraParceira?.razaoSocial ||
    null;

  return (
    <div className="rounded-xl bg-white/[0.06] border border-white/8 px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-white font-semibold text-sm leading-tight truncate">{campanha.titulo}</p>
        {isMock && <MockBadge />}
      </div>
      <div className="flex items-center justify-between mt-1.5 gap-2">
        {seguradora ? (
          <span className="text-blue-400 text-[11px] font-medium truncate">{seguradora}</span>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-1 shrink-0">
          <CalendarDays className="h-2.5 w-2.5 text-white/25" />
          <span className="text-white/35 text-[10px]">
            {formatDateBR(campanha.dataInicio)} → {formatDateBR(campanha.dataFim)}
          </span>
        </div>
      </div>
    </div>
  );
}

const testeStatusConfig: Record<
  TesteItem['status'],
  { label: string; color: string; icon: React.FC<{ className?: string }> }
> = {
  em_andamento: { label: 'Em andamento', color: 'text-yellow-400', icon: Clock },
  concluido: { label: 'Concluído', color: 'text-green-400', icon: CheckCircle2 },
  planejado: { label: 'Planejado', color: 'text-blue-400', icon: FlaskConical },
};

function TesteCard({ teste }: { teste: TesteItem }) {
  const cfg = testeStatusConfig[teste.status];
  const StatusIcon = cfg.icon;
  return (
    <div className="rounded-xl bg-white/[0.06] border border-white/8 px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-white font-semibold text-sm leading-tight">{teste.titulo}</p>
        <MockBadge />
      </div>
      <p className="text-white/40 text-[11px] mt-0.5 leading-snug">{teste.descricao}</p>
      <div className="flex items-center justify-between mt-1.5 gap-2">
        <div className="flex items-center gap-1">
          <StatusIcon className={cn('h-2.5 w-2.5 shrink-0', cfg.color)} />
          <span className={cn('text-[10px] font-medium', cfg.color)}>{cfg.label}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <CalendarDays className="h-2.5 w-2.5 text-white/25" />
          <span className="text-white/35 text-[10px]">até {formatDateBR(teste.dataFim)}</span>
        </div>
      </div>
    </div>
  );
}

function OutroCard({ outro }: { outro: OutroItem }) {
  return (
    <div className="rounded-xl bg-white/[0.06] border border-white/8 px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-white font-semibold text-sm leading-tight truncate">{outro.titulo}</p>
        <MockBadge />
      </div>
      <div className="flex items-center justify-between mt-1.5 gap-2">
        <span className="text-purple-400 text-[10px] font-medium">{outro.tipo}</span>
        <div className="flex items-center gap-1 shrink-0">
          <CalendarDays className="h-2.5 w-2.5 text-white/25" />
          <span className="text-white/35 text-[10px]">{formatDateBR(outro.data)}</span>
        </div>
      </div>
    </div>
  );
}
