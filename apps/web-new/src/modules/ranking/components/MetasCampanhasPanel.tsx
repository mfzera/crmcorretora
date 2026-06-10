import { Target, Megaphone, TrendingUp, CalendarDays, Clock } from 'lucide-react';
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
  if (tipoMetrica === 'taxa_renovacao') return `${valorAlvo}%`;
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

// ── Panel ────────────────────────────────────────────────────────────────────

interface MetasCampanhasPanelProps {
  metas: MetaItem[];
  campanhas: CampanhaItem[];
}

function SectionLabel({ icon: Icon, label }: { icon: React.FC<{ className?: string }>; label: string }) {
  return (
    <div className="flex items-center gap-1 shrink-0">
      <Icon className="h-3 w-3 text-white/25" />
      <span className="text-white/25 text-[9px] uppercase tracking-widest font-semibold">{label}</span>
    </div>
  );
}

function Divider() {
  return <div className="h-5 w-px bg-white/10 shrink-0 mx-1" />;
}

function MetaChip({ meta }: { meta: MetaItem }) {
  return (
    <div className="flex items-center gap-2 pl-2.5 pr-3 py-1.5 rounded-lg bg-white/[0.06] border border-white/8 shrink-0 max-w-[260px]">
      <TrendingUp className="h-3 w-3 text-green-400 shrink-0" />
      <div className="min-w-0">
        <p className="text-white text-[11px] font-semibold truncate leading-tight">{meta.titulo}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-green-400/80 text-[10px] font-medium shrink-0">
            {formatAlvo(meta.tipoMetrica, meta.valorAlvo)}
          </span>
          <span className="text-white/20 text-[10px]">·</span>
          <div className="flex items-center gap-0.5 shrink-0">
            <CalendarDays className="h-2.5 w-2.5 text-white/20" />
            <span className="text-white/30 text-[10px]">até {formatDateBR(meta.dataFim)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function CampanhaChip({ campanha }: { campanha: CampanhaItem }) {
  const seguradora = campanha.seguradoraParceira?.nomeFantasia || campanha.seguradoraParceira?.razaoSocial || null;
  return (
    <div className="flex items-center gap-2 pl-2.5 pr-3 py-1.5 rounded-lg bg-white/[0.06] border border-white/8 shrink-0 max-w-[260px]">
      <Clock className="h-3 w-3 text-blue-400 shrink-0" />
      <div className="min-w-0">
        <p className="text-white text-[11px] font-semibold truncate leading-tight">{campanha.titulo}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          {seguradora && (
            <>
              <span className="text-blue-400/80 text-[10px] font-medium truncate">{seguradora}</span>
              <span className="text-white/20 text-[10px] shrink-0">·</span>
            </>
          )}
          <div className="flex items-center gap-0.5 shrink-0">
            <CalendarDays className="h-2.5 w-2.5 text-white/20" />
            <span className="text-white/30 text-[10px]">
              {formatDateBR(campanha.dataInicio)} → {formatDateBR(campanha.dataFim)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MetasCampanhasPanel({ metas, campanhas }: MetasCampanhasPanelProps) {
  const metasAtivas = metas.filter((m) => m.status === 'ATIVA').slice(0, 5);
  const campanhasAtivas = campanhas.slice(0, 5);

  const temMetas = metasAtivas.length > 0;
  const temCampanhas = campanhasAtivas.length > 0;

  if (!temMetas && !temCampanhas) {
    return (
      <div className="h-full flex items-center px-4">
        <span className="text-white/20 text-xs">Nenhuma meta ou campanha ativa</span>
      </div>
    );
  }

  return (
    <div className="h-full flex items-center gap-3 px-3 overflow-x-auto">
      {temMetas && (
        <>
          <SectionLabel icon={Target} label="Metas" />
          {metasAtivas.map((meta) => (
            <MetaChip key={meta.id} meta={meta} />
          ))}
        </>
      )}

      {temMetas && temCampanhas && <Divider />}

      {temCampanhas && (
        <>
          <SectionLabel icon={Megaphone} label="Campanhas" />
          {campanhasAtivas.map((c) => (
            <CampanhaChip key={c.id} campanha={c} />
          ))}
        </>
      )}
    </div>
  );
}
