import { createFileRoute } from '@tanstack/react-router';

import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { FileText, ChevronRight } from 'lucide-react';
import { getPortalApolices, type Apolice } from '@/infra/http/portal-api';
import { formatDateFull as formatDate, getStatusBadge, getTipoSeguroLabel } from '@/modules/portal/utils/portal-utils';

export const Route = createFileRoute('/_portal/portal/$subdominio/apolices/')({
  component: PortalApolicesPage,
});


function PortalApolicesPage() {
  const { subdominio } = Route.useParams();
  const [apolices, setApolices] = useState<Apolice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPortalApolices()
      .then(setApolices)
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h1
          className="text-xl font-bold text-white"
          style={{ fontFamily: '"Sora", sans-serif', letterSpacing: '-0.02em' }}
        >
          Minhas Apólices
        </h1>
        <p className="mt-1 text-sm text-[#525252]">
          Todas as suas coberturas ativas
        </p>
      </div>

      {loading ? (
        <div className="space-y-2 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-[#18181b]" />
          ))}
        </div>
      ) : apolices.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#262628] p-12 text-center">
          <FileText className="mx-auto mb-3 h-10 w-10 text-[#525252]" />
          <p className="font-semibold text-white">Nenhuma apólice ativa</p>
          <p className="mt-1 text-sm text-[#525252]">
            Entre em contato com sua corretora para mais informações.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {apolices.map((a) => {
            const badge = getStatusBadge(a.diasParaVencer);
            return (
              <Link
                key={a.id}
                to="/portal/$subdominio/apolices/$id" params={{ subdominio, id: a.id }}
                className="flex items-center justify-between rounded-xl border border-[#262628] bg-[#18181b] p-4 transition-colors hover:bg-white/[0.02]"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm text-white">{a.produto.nomeProduto}</p>
                    <span className="text-xs text-[#525252]">
                      {getTipoSeguroLabel(a.produto.tipoSeguro)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-[#a1a1aa]">
                    {a.seguradora && (
                      <span>{a.seguradora.nomeFantasia ?? a.seguradora.razaoSocial}</span>
                    )}
                    {a.numeroApoliceExterna && (
                      <span>Apólice {a.numeroApoliceExterna}</span>
                    )}
                    <span>
                      {formatDate(a.vigenciaInicio)} – {formatDate(a.vigenciaFim)}
                    </span>
                  </div>
                </div>
                <div className="ml-3 flex shrink-0 items-center gap-2">
                  <span
                    className={`hidden items-center rounded-full px-2.5 py-0.5 text-xs font-medium sm:inline-flex ${badge.className}`}
                  >
                    {badge.label}
                  </span>
                  <ChevronRight className="h-4 w-4 text-[#525252]" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
