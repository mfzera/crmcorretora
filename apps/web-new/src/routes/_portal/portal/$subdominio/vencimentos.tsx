import { createFileRoute } from '@tanstack/react-router';

import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Clock, CheckCircle2, ChevronRight, AlertTriangle } from 'lucide-react';
import { getPortalVencimentos, type Apolice } from '@/infra/http/portal-api';
import { formatDate, getTipoSeguroLabel } from '@/modules/portal/utils/portal-utils';

export const Route = createFileRoute('/_portal/portal/$subdominio/vencimentos')({
  component: PortalVencimentosPage,
});


type VencimentosData = {
  vencidas: Apolice[];
  em30dias: Apolice[];
  em60dias: Apolice[];
  em90dias: Apolice[];
};

function ApoliceRow({ apolice, subdominio }: { apolice: Apolice; subdominio: string }) {
  return (
    <Link
      to="/portal/$subdominio/apolices/$id" params={{ subdominio, id: apolice.id }}
      className="flex items-center justify-between rounded-xl border border-[#262628] bg-[#18181b] p-3.5 transition-colors hover:bg-white/[0.02]"
    >
      <div className="min-w-0 space-y-0.5">
        <p className="text-sm font-semibold text-white">{apolice.produto.nomeProduto}</p>
        <p className="text-xs text-[#a1a1aa]">
          {apolice.seguradora?.nomeFantasia ?? apolice.seguradora?.razaoSocial ?? '–'}
          {' · '}Vence em {formatDate(apolice.vigenciaFim)}
        </p>
      </div>
      <ChevronRight className="ml-3 h-4 w-4 shrink-0 text-[#525252]" />
    </Link>
  );
}

function Grupo({
  titulo,
  icone: Icon,
  corClass,
  countClass,
  apolices,
  subdominio,
}: {
  titulo: string;
  icone: React.ComponentType<{ className?: string }>;
  corClass: string;
  countClass: string;
  apolices: Apolice[];
  subdominio: string;
}) {
  if (apolices.length === 0) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${corClass}`} />
        <span className={`text-sm font-semibold ${corClass}`}>{titulo}</span>
        <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-semibold ${countClass}`}>
          {apolices.length}
        </span>
      </div>
      <div className="space-y-1.5">
        {apolices.map((a) => (
          <ApoliceRow key={a.id} apolice={a} subdominio={subdominio} />
        ))}
      </div>
    </div>
  );
}

function PortalVencimentosPage() {
  const { subdominio } = Route.useParams();
  const [data, setData] = useState<VencimentosData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPortalVencimentos()
      .then(setData)
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  const total =
    (data?.vencidas.length ?? 0) +
    (data?.em30dias.length ?? 0) +
    (data?.em60dias.length ?? 0) +
    (data?.em90dias.length ?? 0);

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-xl font-bold text-white"
          style={{ fontFamily: '"Sora", sans-serif', letterSpacing: '-0.02em' }}
        >
          Vencimentos
        </h1>
        <p className="mt-1 text-sm text-[#525252]">
          Apólices com prazo nos próximos 90 dias
        </p>
      </div>

      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-[#18181b]" />
          ))}
        </div>
      ) : total === 0 ? (
        <div className="rounded-xl border border-dashed border-[#262628] p-12 text-center">
          <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-[#525252]" />
          <p className="font-semibold text-white">Nenhum vencimento próximo</p>
          <p className="mt-1 text-sm text-[#525252]">
            Suas apólices estão em dia nos próximos 90 dias.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <Grupo
            titulo="Vencidas"
            icone={AlertTriangle}
            corClass="text-red-400"
            countClass="bg-red-500/10 text-red-400"
            apolices={data?.vencidas ?? []}
            subdominio={subdominio}
          />
          <Grupo
            titulo="Vencem em 30 dias"
            icone={Clock}
            corClass="text-amber-400"
            countClass="bg-amber-500/10 text-amber-400"
            apolices={data?.em30dias ?? []}
            subdominio={subdominio}
          />
          <Grupo
            titulo="Vencem em 60 dias"
            icone={Clock}
            corClass="text-orange-400"
            countClass="bg-orange-500/10 text-orange-400"
            apolices={data?.em60dias ?? []}
            subdominio={subdominio}
          />
          <Grupo
            titulo="Vencem em 90 dias"
            icone={Clock}
            corClass="text-[#525252]"
            countClass="bg-white/5 text-[#a1a1aa]"
            apolices={data?.em90dias ?? []}
            subdominio={subdominio}
          />
        </div>
      )}
    </div>
  );
}
