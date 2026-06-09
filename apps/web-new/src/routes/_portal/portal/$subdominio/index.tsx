import { createFileRoute } from '@tanstack/react-router';

import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import {
  FileText,
  AlertTriangle,
  Clock,
  ChevronRight,
  Phone,
  Mail,
  ShieldCheck,
  Calendar,
  Send,
  X,
  Home,
  Car,
  Heart,
  Activity,
  Briefcase,
  Leaf,
  Truck,
  Package,
  Globe,
  MessageSquare,
} from 'lucide-react';
import { toast } from 'sonner';
import { usePortalAuthStore } from '@/infra/auth/portal-auth-store';
import {
  getPortalApolices,
  getPortalVencimentos,
  getPortalProdutos,
  getCorretoraPublica,
  solicitarCotacao,
  type Apolice,
  type Produto,
} from '@/infra/http/portal-api';
import {
  formatDate,
  formatDateFull,
  getStatusBadge,
  getTipoSeguroLabel,
} from '@/modules/portal/utils/portal-utils';
import { Button } from '@/core/ui/button';
import { Textarea } from '@/core/ui/textarea';
import {

  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/core/ui/dialog';

export const Route = createFileRoute('/_portal/portal/$subdominio/')({
  component: PortalDashboardPage,
});

type CorretoraData = Awaited<ReturnType<typeof getCorretoraPublica>>;

// ---------- helpers ----------

function formatCnpj(cnpj: string | null) {
  if (!cnpj) return null;
  const d = cnpj.replace(/\D/g, '');
  if (d.length !== 14) return cnpj;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

function proximaRenovacao(apolices: Apolice[]): string | null {
  const hoje = new Date().toISOString().split('T')[0];
  const futuras = apolices
    .filter((a) => a.vigenciaFim > hoje)
    .sort((a, b) => a.vigenciaFim.localeCompare(b.vigenciaFim));
  if (!futuras.length) return null;
  const d = new Date(futuras[0].vigenciaFim + 'T12:00:00');
  return d
    .toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
    .replace('.', '')
    .replace(/^(\w)/, (c) => c.toUpperCase());
}

function seguradorasUnicas(apolices: Apolice[]) {
  const map = new Map<
    string,
    NonNullable<Apolice['seguradora']> & {
      apoliceNumero: string;
      tipoSeguro: string;
    }
  >();
  for (const a of apolices) {
    if (a.seguradora) {
      const key = a.seguradora.nomeFantasia ?? a.seguradora.razaoSocial ?? '';
      if (!map.has(key)) {
        map.set(key, {
          ...a.seguradora,
          apoliceNumero: a.numeroApoliceExterna ?? a.numeroDocumento,
          tipoSeguro: a.produto.tipoSeguro,
        });
      }
    }
  }
  return Array.from(map.values());
}

function formatPreco(valor: string | null) {
  if (!valor) return null;
  const n = parseFloat(valor);
  if (isNaN(n)) return null;
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function getTipoIcon(tipo: string | null) {
  switch (tipo) {
    case 'AUTO': return Car;
    case 'RESIDENCIAL': return Home;
    case 'VIDA': return Heart;
    case 'SAUDE': return Activity;
    case 'EMPRESARIAL': return Briefcase;
    case 'RURAL': return Leaf;
    case 'TRANSPORTE': return Truck;
    default: return Package;
  }
}

const SEGURADORA_COLORS = [
  { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  { bg: 'bg-red-500/20', text: 'text-red-400' },
  { bg: 'bg-teal-500/20', text: 'text-teal-400' },
  { bg: 'bg-orange-500/20', text: 'text-orange-400' },
  { bg: 'bg-purple-500/20', text: 'text-purple-400' },
  { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
];

// ---------- main ----------

function PortalDashboardPage() {
  const { subdominio } = Route.useParams();
  const { corretora: corretoraStore } = usePortalAuthStore();

  const [apolices, setApolices] = useState<Apolice[]>([]);
  const [avisos, setAvisos] = useState<{ vencidas: Apolice[]; em30dias: Apolice[] }>({
    vencidas: [],
    em30dias: [],
  });
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [corretora, setCorretora] = useState<CorretoraData | null>(null);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProduto, setSelectedProduto] = useState<Produto | null>(null);
  const [mensagem, setMensagem] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    Promise.all([
      getPortalApolices(),
      getPortalVencimentos(),
      getPortalProdutos(),
      getCorretoraPublica(subdominio),
    ])
      .then(([a, v, p, c]) => {
        setApolices(a);
        setAvisos({ vencidas: v.vencidas, em30dias: v.em30dias });
        setProdutos(p);
        setCorretora(c);
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [subdominio]);

  const totalAvisos = avisos.vencidas.length + avisos.em30dias.length;
  const seguradoras = seguradorasUnicas(apolices);
  const renovacao = proximaRenovacao(apolices);

  function openDialog(produto: Produto) {
    setSelectedProduto(produto);
    setMensagem('');
    setDialogOpen(true);
  }

  async function handleSolicitar() {
    if (!selectedProduto) return;
    setEnviando(true);
    try {
      await solicitarCotacao({ produtoId: selectedProduto.id, mensagem: mensagem || undefined });
      toast.success('Solicitação enviada! Sua corretora entrará em contato.');
      setDialogOpen(false);
    } catch {
      toast.error('Erro ao enviar solicitação. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  }

  const base = `/portal/${subdominio}`;
  const nomeCorretora =
    corretora?.nomeFantasia ?? corretoraStore?.nomeFantasia ?? 'Corretora';
  const cnpjFmt = formatCnpj(corretora?.cnpj ?? null);
  const cidadeUf =
    corretora?.cidade && corretora.uf
      ? `${corretora.cidade}, ${corretora.uf}`
      : corretora?.cidade ?? null;

  const corretoraInitials = nomeCorretora
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w: string) => w[0].toUpperCase())
    .join('') || 'C';

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-28 rounded-xl bg-[#18181b]" />
        <div className="h-[85px] rounded-xl bg-[#111113]" />
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="h-64 rounded-xl bg-[#18181b]" />
          <div className="space-y-4">
            <div className="h-40 rounded-xl bg-[#18181b]" />
            <div className="h-40 rounded-xl bg-[#18181b]" />
          </div>
        </div>
        <div className="h-48 rounded-xl bg-[#18181b]" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* ── Hero: Corretora ── */}
        <div className="rounded-xl bg-[#18181b] px-8 py-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-10">
            {/* Badge */}
            <div
              className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-[14px] text-2xl font-black text-black"
              style={{ backgroundColor: '#00FF87', fontFamily: '"Sora", sans-serif' }}
            >
              {corretoraInitials}
            </div>

            {/* Nome + info */}
            <div className="flex-1 min-w-0">
              <h1
                className="text-2xl font-extrabold leading-tight text-white"
                style={{ fontFamily: '"Sora", sans-serif', letterSpacing: '-0.03em' }}
              >
                {nomeCorretora}
              </h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-[#525252]">
                {cnpjFmt && <span>CNPJ {cnpjFmt}</span>}
                {cnpjFmt && <span>·</span>}
                <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
                  Registro ativo
                </span>
              </div>
            </div>

            {/* Contatos desktop */}
            <div className="hidden items-start gap-10 sm:flex">
              {corretora?.telefone && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#525252]">
                    Telefone
                  </p>
                  <p className="mt-1 text-sm font-medium text-white">{corretora.telefone}</p>
                </div>
              )}
              {corretora?.emailContato && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#525252]">
                    E-mail
                  </p>
                  <p className="mt-1 text-sm font-medium text-white">{corretora.emailContato}</p>
                </div>
              )}
              {cidadeUf && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#525252]">
                    Cidade
                  </p>
                  <p className="mt-1 text-sm font-medium text-white">{cidadeUf}</p>
                </div>
              )}
            </div>

            {/* Contatos mobile */}
            <div className="flex flex-wrap gap-3 text-sm text-[#525252] sm:hidden">
              {corretora?.telefone && <span>{corretora.telefone}</span>}
              {cidadeUf && <span>{cidadeUf}</span>}
            </div>
          </div>
        </div>

        {/* ── Stats — painel flat (gap:1px trick, igual ao Paper design) ── */}
        <div
          className="hidden overflow-hidden rounded-xl sm:flex"
          style={{ gap: '1px', backgroundColor: '#1E1E24' }}
        >
          {/* Documentos Ativos */}
          <div className="flex flex-1 items-center gap-4 bg-[#111113] px-8 py-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#00FF87]/[0.10]">
              <FileText className="h-5 w-5 text-[#00FF87]" />
            </div>
            <div>
              <p
                className="leading-none"
                style={{ fontSize: '26px', fontFamily: '"Sora", sans-serif', fontWeight: 800, letterSpacing: '-0.04em', color: '#00FF87' }}
              >
                {apolices.length}
              </p>
              <p className="mt-0.5 text-[12px] text-[#A3A3A3]">Documentos Ativos</p>
            </div>
          </div>
          {/* Seguradoras */}
          <div className="flex flex-1 items-center gap-4 bg-[#111113] px-8 py-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#22C55E]/[0.10]">
              <ShieldCheck className="h-5 w-5 text-[#22C55E]" />
            </div>
            <div>
              <p
                className="leading-none"
                style={{ fontSize: '26px', fontFamily: '"Sora", sans-serif', fontWeight: 800, letterSpacing: '-0.04em', color: '#22C55E' }}
              >
                {seguradoras.length}
              </p>
              <p className="mt-0.5 text-[12px] text-[#A3A3A3]">Seguradoras</p>
            </div>
          </div>
          {/* Avisos Pendentes */}
          <div className="flex flex-1 items-center gap-4 bg-[#111113] px-8 py-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#F59E0B]/[0.10]">
              <AlertTriangle className="h-5 w-5 text-[#F59E0B]" />
            </div>
            <div>
              <p
                className="leading-none"
                style={{ fontSize: '26px', fontFamily: '"Sora", sans-serif', fontWeight: 800, letterSpacing: '-0.04em', color: '#F59E0B' }}
              >
                {totalAvisos}
              </p>
              <p className="mt-0.5 text-[12px] text-[#A3A3A3]">Avisos Pendentes</p>
            </div>
          </div>
          {/* Próxima Renovação */}
          <div className="flex flex-1 items-center gap-4 bg-[#111113] px-8 py-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#3B82F6]/[0.10]">
              <Calendar className="h-5 w-5 text-[#3B82F6]" />
            </div>
            <div>
              <p
                className="leading-none"
                style={{ fontSize: '26px', fontFamily: '"Sora", sans-serif', fontWeight: 800, letterSpacing: '-0.04em', color: '#3B82F6' }}
              >
                {renovacao ?? '–'}
              </p>
              <p className="mt-0.5 text-[12px] text-[#A3A3A3]">Próxima Renovação</p>
            </div>
          </div>
        </div>

        {/* Stats mobile — 3 cards */}
        <div className="flex gap-3 sm:hidden">
          <div className="flex flex-1 flex-col gap-2 rounded-xl border border-[#262628] bg-[#18181b] p-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#00FF87]/[0.10]">
              <FileText className="h-4 w-4 text-[#00FF87]" />
            </div>
            <p className="text-2xl font-bold text-white">{apolices.length}</p>
            <p className="text-[12px] text-[#525252]">Docs. Ativos</p>
          </div>
          <div className="flex flex-1 flex-col gap-2 rounded-xl border border-[#262628] bg-[#18181b] p-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#22C55E]/[0.10]">
              <ShieldCheck className="h-4 w-4 text-[#22C55E]" />
            </div>
            <p className="text-2xl font-bold text-white">{seguradoras.length}</p>
            <p className="text-[12px] text-[#525252]">Seguradoras</p>
          </div>
          <div className="flex flex-1 flex-col gap-2 rounded-xl border border-[#262628] bg-[#18181b] p-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#F59E0B]/[0.10]">
              <AlertTriangle className="h-4 w-4 text-[#F59E0B]" />
            </div>
            <p className="text-2xl font-bold text-white">{totalAvisos}</p>
            <p className="text-[12px] text-[#525252]">Avisos</p>
          </div>
        </div>

        {/* Alert banner mobile */}
        {totalAvisos > 0 && (
          <Link
            to="/portal/$subdominio/vencimentos" params={{ subdominio }}
            className="flex gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3.5 sm:hidden"
          >
            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/20">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-400">
                {avisos.em30dias.length > 0
                  ? `Apólice a vencer em 30 dias`
                  : `Apólice vencida`}
              </p>
              {(avisos.em30dias[0] ?? avisos.vencidas[0]) && (
                <p className="mt-0.5 text-xs text-[#a1a1aa]">
                  {getTipoSeguroLabel((avisos.em30dias[0] ?? avisos.vencidas[0]).produto.tipoSeguro)}
                  {' '}
                  {(avisos.em30dias[0] ?? avisos.vencidas[0]).numeroApoliceExterna ?? ''}
                  {' '}vence em {formatDateFull((avisos.em30dias[0] ?? avisos.vencidas[0]).vigenciaFim)}.
                </p>
              )}
            </div>
          </Link>
        )}

        {/* ── Dois colunas ── */}
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          {/* Esquerda: Documentos Ativos */}
          <div className="rounded-xl border border-[#262628] bg-[#18181b]">
            <div className="flex items-center justify-between border-b border-[#262628] px-5 py-4">
              <h2
                className="text-sm font-semibold text-white"
                style={{ fontFamily: '"Sora", sans-serif' }}
              >
                Documentos Ativos
              </h2>
              <Link
                to="/portal/$subdominio/apolices" params={{ subdominio }}
                className="flex items-center gap-1 text-xs font-medium text-[#00FF87] hover:opacity-80 transition-opacity"
              >
                Ver todos <ChevronRight className="h-3 w-3" />
              </Link>
            </div>

            {apolices.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <FileText className="mx-auto mb-2 h-8 w-8 text-[#525252]" />
                <p className="text-sm text-[#525252]">Nenhuma apólice ativa</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#262628]">
                      <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[#525252]">
                        Apólice / Tipo
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[#525252]">
                        Seguradora
                      </th>
                      <th className="hidden px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[#525252] sm:table-cell">
                        Vigência
                      </th>
                      <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-[#525252]">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {apolices.map((a) => {
                      const { label, className } = getStatusBadge(a.diasParaVencer);
                      return (
                        <tr
                          key={a.id}
                          className="border-b border-[#262628]/60 last:border-0 hover:bg-white/[0.02] transition-colors"
                        >
                          <td className="px-5 py-3.5">
                            <Link to="/portal/$subdominio/apolices/$id" params={{ subdominio, id: a.id }} className="block hover:opacity-80">
                              <p className="font-semibold text-white leading-snug">
                                {getTipoSeguroLabel(a.produto.tipoSeguro)}
                              </p>
                              {a.numeroApoliceExterna && (
                                <p className="text-xs text-[#525252] mt-0.5">
                                  {a.numeroApoliceExterna}
                                </p>
                              )}
                            </Link>
                          </td>
                          <td className="px-4 py-3.5 text-sm text-[#a1a1aa]">
                            {a.seguradora?.nomeFantasia ?? a.seguradora?.razaoSocial ?? '–'}
                          </td>
                          <td className="hidden px-4 py-3.5 text-xs text-[#a1a1aa] sm:table-cell">
                            {formatDate(a.vigenciaInicio)} – {formatDate(a.vigenciaFim)}
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}
                            >
                              {label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Direita: Avisos + Ofertas */}
          <div className="space-y-4">
            {/* Avisos */}
            <div className="rounded-xl border border-[#262628] bg-[#18181b]">
              <div className="flex items-center justify-between border-b border-[#262628] px-5 py-4">
                <h2
                  className="text-sm font-semibold text-white"
                  style={{ fontFamily: '"Sora", sans-serif' }}
                >
                  Avisos
                </h2>
                {totalAvisos > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                    {totalAvisos} {totalAvisos === 1 ? 'pendente' : 'pendentes'}
                  </span>
                )}
              </div>
              <div className="divide-y divide-[#262628]/60">
                {totalAvisos === 0 ? (
                  <p className="px-5 py-5 text-sm text-[#525252]">
                    Nenhum aviso no momento.
                  </p>
                ) : (
                  <>
                    {avisos.vencidas.map((a) => (
                      <Link
                        key={a.id}
                        to="/portal/$subdominio/apolices/$id" params={{ subdominio, id: a.id }}
                        className="flex gap-3 px-4 py-4 hover:bg-white/[0.02] transition-colors"
                      >
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-500/10">
                          <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-red-400 leading-snug">
                            Apólice vencida
                          </p>
                          <p className="mt-0.5 text-xs text-[#a1a1aa] line-clamp-2">
                            {getTipoSeguroLabel(a.produto.tipoSeguro)}
                            {a.numeroApoliceExterna && ` ${a.numeroApoliceExterna}`} venceu
                            em {formatDateFull(a.vigenciaFim)}.
                          </p>
                        </div>
                      </Link>
                    ))}
                    {avisos.em30dias.map((a) => (
                      <Link
                        key={a.id}
                        to="/portal/$subdominio/apolices/$id" params={{ subdominio, id: a.id }}
                        className="flex gap-3 px-4 py-4 hover:bg-white/[0.02] transition-colors"
                      >
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/10">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-amber-400 leading-snug">
                            Apólice a vencer em 30 dias
                          </p>
                          <p className="mt-0.5 text-xs text-[#a1a1aa] line-clamp-2">
                            {getTipoSeguroLabel(a.produto.tipoSeguro)}
                            {a.numeroApoliceExterna && ` ${a.numeroApoliceExterna}`} vence em{' '}
                            {formatDateFull(a.vigenciaFim)}. Contate sua corretora para renovação.
                          </p>
                        </div>
                      </Link>
                    ))}
                  </>
                )}
              </div>
            </div>

            {/* Ofertas da Corretora */}
            {produtos.length > 0 && (
              <div className="rounded-xl border border-[#262628] bg-[#18181b]">
                <div className="flex items-center justify-between border-b border-[#262628] px-5 py-4">
                  <h2
                    className="text-sm font-semibold text-white"
                    style={{ fontFamily: '"Sora", sans-serif' }}
                  >
                    Ofertas da Corretora
                  </h2>
                  <Link
                    to="/portal/$subdominio/produtos" params={{ subdominio }}
                    className="flex items-center gap-1 text-xs font-medium text-[#00FF87] hover:opacity-80 transition-opacity"
                  >
                    Ver mais <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
                <div className="divide-y divide-[#262628]/60">
                  {produtos.slice(0, 3).map((p) => {
                    const Icon = getTipoIcon(p.tipoSeguro);
                    const preco = formatPreco(p.premioMinimo);
                    return (
                      <div
                        key={p.id}
                        className="flex items-center gap-3 px-4 py-4"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#00FF87]/[0.08]">
                          <Icon className="h-4 w-4 text-[#00FF87]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-white leading-snug">
                            {p.nomeProduto}
                          </p>
                          {p.descricao && (
                            <p className="mt-0.5 line-clamp-1 text-xs text-[#a1a1aa]">
                              {p.descricao}
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1.5">
                          {preco && (
                            <span className="text-sm font-bold text-[#00FF87] whitespace-nowrap">
                              {preco}/mês
                            </span>
                          )}
                          <button
                            onClick={() => openDialog(p)}
                            className="text-xs font-medium text-[#525252] hover:text-[#00FF87] transition-colors"
                          >
                            Cotar
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Atendimento ── */}
        {seguradoras.length > 0 && (
          <div className="rounded-xl border border-[#262628] bg-[#18181b]">
            <div className="flex items-center justify-between border-b border-[#262628] px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#00FF87]/[0.08]">
                  <Mail className="h-3.5 w-3.5 text-[#00FF87]" />
                </div>
                <h2
                  className="text-sm font-semibold text-white"
                  style={{ fontFamily: '"Sora", sans-serif' }}
                >
                  Atendimento — Contatos das Seguradoras
                </h2>
              </div>
              <span className="text-xs text-[#525252]">
                {seguradoras.length}{' '}
                {seguradoras.length === 1 ? 'seguradora ativa' : 'seguradoras ativas'}
              </span>
            </div>
            <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
              {seguradoras.map((s, i) => {
                const nome = s.nomeFantasia ?? s.razaoSocial ?? 'Seguradora';
                const initials = nome
                  .split(' ')
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((w) => w[0].toUpperCase())
                  .join('');
                const color = SEGURADORA_COLORS[i % SEGURADORA_COLORS.length];
                return (
                  <div key={i} className="rounded-xl border border-[#262628]/60 bg-[#0a0a0b] p-4">
                    <div className="mb-3 flex items-center gap-2.5">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold ${color.bg} ${color.text}`}
                      >
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white leading-tight">
                          {nome}
                        </p>
                        <p className="text-[11px] text-[#525252]">
                          {getTipoSeguroLabel(s.tipoSeguro)} · {s.apoliceNumero}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      {s.telefone && (
                        <a
                          href={`tel:${s.telefone}`}
                          className="flex items-center gap-2 text-xs text-[#a1a1aa] hover:text-white transition-colors"
                        >
                          <Phone className="h-3 w-3 shrink-0" />
                          {s.telefone}
                        </a>
                      )}
                      {s.telefone24h && (
                        <a
                          href={`tel:${s.telefone24h}`}
                          className="flex items-center gap-2 text-xs text-[#a1a1aa] hover:text-white transition-colors"
                        >
                          <Phone className="h-3 w-3 shrink-0" />
                          {s.telefone24h}
                          <span className="rounded bg-amber-500/15 px-1 py-px text-[10px] font-semibold text-amber-400">
                            24h
                          </span>
                        </a>
                      )}
                      {s.email && (
                        <a
                          href={`mailto:${s.email}`}
                          className="flex items-center gap-2 text-xs text-[#a1a1aa] hover:text-white transition-colors"
                        >
                          <Mail className="h-3 w-3 shrink-0" />
                          <span className="truncate">{s.email}</span>
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Dialog cotação */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Solicitar Cotação</DialogTitle>
            <DialogDescription>
              {selectedProduto?.nomeProduto} — sua corretora receberá a solicitação e entrará em contato.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Mensagem (opcional)</label>
            <Textarea
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              placeholder="Adicione detalhes ou dúvidas para sua corretora..."
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={enviando}>
              <X className="mr-1.5 h-4 w-4" />
              Cancelar
            </Button>
            <Button onClick={handleSolicitar} disabled={enviando} className="gap-1.5">
              <Send className="h-4 w-4" />
              {enviando ? 'Enviando...' : 'Enviar solicitação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
