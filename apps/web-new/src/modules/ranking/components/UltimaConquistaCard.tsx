import { Trophy } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/core/ui/avatar';
import { fromNow } from '@/core/utils/date-utils';
import { type UltimaConquista } from '@/modules/gamificacao/http';
import { badgeIconMap } from '@/modules/gamificacao/utils/badge-icon-map';

interface UltimaConquistaCardProps {
  conquista: UltimaConquista | null;
  avatarUrl?: string | null;
}

function getInitials(name: string) {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

function BadgeIcon({ icone, cor }: { icone: string; cor: string }) {
  const Icon = badgeIconMap[icone];

  return (
    <div
      className="flex items-center justify-center h-12 w-12 rounded-xl shrink-0"
      style={{ backgroundColor: `${cor}22`, border: `1px solid ${cor}44` }}
    >
      {Icon ? (
        <Icon className="h-6 w-6" style={{ color: cor }} />
      ) : (
        <span className="text-2xl leading-none">{icone}</span>
      )}
    </div>
  );
}

export function UltimaConquistaCard({ conquista, avatarUrl }: UltimaConquistaCardProps) {
  return (
    <div className="w-[260px] sm:w-[280px] rounded-2xl bg-black/65 backdrop-blur-xl border border-white/10 overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-1.5">
          <Trophy className="h-3.5 w-3.5 text-amber-400" />
          <span className="text-white text-sm font-semibold">Última Conquista</span>
        </div>
        {conquista && (
          <span className="text-white/25 text-[10px]">{fromNow(conquista.createdAt)}</span>
        )}
      </div>

      {conquista ? (
        <>
          {/* Usuário */}
          <div className="flex items-center gap-3 px-4 pb-4 border-b border-white/8">
            <Avatar className="h-12 w-12 shrink-0 ring-2 ring-white/10">
              {(avatarUrl ?? conquista.usuario.avatarUrl) && (
                <AvatarImage src={(avatarUrl ?? conquista.usuario.avatarUrl)!} alt={conquista.usuario.nome} />
              )}
              <AvatarFallback className="bg-white/10 text-white font-bold text-base">
                {getInitials(conquista.usuario.nome)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-white font-semibold text-sm leading-tight truncate">
                {conquista.usuario.nome}
              </p>
              <p className="text-white/40 text-[11px] mt-0.5">conquistou um badge</p>
            </div>
          </div>

          {/* Badge */}
          <div className="px-4 py-4 flex items-start gap-3">
            <BadgeIcon icone={conquista.badgeTipo.icone} cor={conquista.badgeTipo.cor} />
            <div className="min-w-0 flex-1">
              <p className="text-white font-bold text-sm leading-tight">{conquista.badgeTipo.nome}</p>
              {conquista.badgeTipo.descricao && (
                <p className="text-white/40 text-[11px] mt-1 leading-snug line-clamp-2">
                  {conquista.badgeTipo.descricao}
                </p>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="px-4 py-6 text-center text-white/25 text-sm">
          Nenhuma conquista ainda
        </div>
      )}
    </div>
  );
}
