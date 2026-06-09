import { ArrowUpRight, Zap, Calendar, Shield } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/core/ui/avatar';
import { fromNow, formatDateBR } from '@/core/utils/date-utils';

export interface UltimaVenda {
  vendedor?: { id?: string; nome?: string };
  produto?: { nomeProduto?: string; tipoSeguro?: string };
  seguradoraParceira?: { razaoSocial?: string; nomeFantasia?: string } | null;
  tipoDocumento?: string;
  premioLiquido?: number | null;
  valorComissao?: number | null;
  percentualComissao?: number | null;
  vigenciaInicio?: string | null;
  vigenciaFim?: string | null;
  createdAt: string;
}

interface UltimaVendaCardProps {
  venda: UltimaVenda | null;
  avatarUrl?: string | null;
  cargo?: string | null;
}

function getInitials(name: string) {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

function formatBRL(value: number | null | undefined) {
  if (value == null) return null;
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });
}

export function UltimaVendaCard({ venda, avatarUrl, cargo }: UltimaVendaCardProps) {
  const nomeVendedor = venda?.vendedor?.nome || 'Vendedor';
  const nomeProduto = venda?.produto?.nomeProduto || venda?.tipoDocumento || '—';
  const tipoSeguro = venda?.produto?.tipoSeguro;
  const seguradora =
    venda?.seguradoraParceira?.nomeFantasia ||
    venda?.seguradoraParceira?.razaoSocial ||
    null;
  const premio = formatBRL(venda?.premioLiquido);
  const comissaoValor = formatBRL(venda?.valorComissao);
  const comissaoPct = venda?.percentualComissao != null
    ? `${venda.percentualComissao.toFixed(1)}%`
    : null;

  const vigencia =
    venda?.vigenciaInicio && venda?.vigenciaFim
      ? `${formatDateBR(venda.vigenciaInicio)} → ${formatDateBR(venda.vigenciaFim)}`
      : venda?.vigenciaInicio
        ? `A partir de ${formatDateBR(venda.vigenciaInicio)}`
        : null;

  return (
    <div className="w-[280px] sm:w-[310px] rounded-2xl bg-black/65 backdrop-blur-xl border border-white/10 overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5 text-yellow-400" />
          <span className="text-white text-sm font-semibold">Última Venda</span>
        </div>
        <ArrowUpRight className="h-4 w-4 text-white/25" />
      </div>

      {/* Vendedor */}
      <div className="flex items-center gap-3 px-4 pb-4 border-b border-white/8">
        <Avatar className="h-12 w-12 shrink-0 ring-2 ring-white/10">
          {avatarUrl && <AvatarImage src={avatarUrl} alt={nomeVendedor} />}
          <AvatarFallback className="bg-white/10 text-white font-bold text-base">
            {getInitials(nomeVendedor)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="text-white font-semibold text-sm leading-tight truncate">{nomeVendedor}</p>
          {cargo && (
            <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/50 font-medium truncate max-w-full">
              {cargo}
            </span>
          )}
        </div>
      </div>

      {/* Prêmio + Comissão */}
      {(premio || comissaoValor) && (
        <div className="px-4 py-3 border-b border-white/8">
          {premio && (
            <div className="mb-2">
              <p className="text-white/35 text-[10px] uppercase tracking-widest">Prêmio líquido</p>
              <p className="text-white text-2xl font-bold tracking-tight leading-tight">{premio}</p>
            </div>
          )}
          {(comissaoValor || comissaoPct) && (
            <div>
              <p className="text-white/35 text-[10px] uppercase tracking-widest">
                Comissão{comissaoPct ? ` · ${comissaoPct}` : ''}
              </p>
              {comissaoValor && (
                <p className="text-white/80 text-base font-semibold leading-tight">{comissaoValor}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Produto + Seguradora */}
      <div className="grid grid-cols-2 gap-px px-4 py-3 border-b border-white/8">
        <div className="pr-3">
          <p className="text-white/35 text-[10px] uppercase tracking-widest mb-0.5">Produto</p>
          <p className="text-white text-xs font-medium leading-tight truncate">{nomeProduto}</p>
          {tipoSeguro && (
            <p className="text-white/30 text-[10px] truncate mt-0.5">{tipoSeguro}</p>
          )}
        </div>
        {seguradora ? (
          <div>
            <div className="flex items-center gap-1 mb-0.5">
              <Shield className="h-2.5 w-2.5 text-white/25" />
              <p className="text-white/35 text-[10px] uppercase tracking-widest">Seguradora</p>
            </div>
            <p className="text-white text-xs font-medium leading-tight truncate">{seguradora}</p>
          </div>
        ) : (
          <div />
        )}
      </div>

      {/* Vigência + Tempo */}
      <div className="px-4 py-3 flex items-center justify-between gap-3">
        {vigencia ? (
          <div className="min-w-0">
            <div className="flex items-center gap-1 mb-0.5">
              <Calendar className="h-2.5 w-2.5 text-white/25" />
              <p className="text-white/35 text-[10px] uppercase tracking-widest">Vigência</p>
            </div>
            <p className="text-white/70 text-xs font-medium">{vigencia}</p>
          </div>
        ) : (
          <div />
        )}
        {venda && (
          <p className="text-white/25 text-[10px] shrink-0">{fromNow(venda.createdAt)}</p>
        )}
      </div>

      {!venda && (
        <div className="px-4 py-6 text-center text-white/25 text-sm">
          Nenhuma venda nos últimos 30 dias
        </div>
      )}
    </div>
  );
}
