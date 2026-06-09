import { Crown, Award, Target, Swords } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/core/ui/avatar';
import { type RankingItem } from '@/modules/gamificacao/http';

interface TopVendedorCardProps {
  item: RankingItem | null;
}

function getInitials(name: string) {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

export function TopVendedorCard({ item }: TopVendedorCardProps) {
  if (!item) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-2 text-white/20 p-6">
        <Crown className="h-8 w-8" />
        <p className="text-xs text-center">Sem líder no período</p>
      </div>
    );
  }

  return (
    <div className="relative h-full flex flex-col overflow-hidden">
      {/* Avatar background blur */}
      {item.avatarUrl && (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-15 scale-110"
          style={{ backgroundImage: `url(${item.avatarUrl})`, filter: 'blur(12px)' }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

      {/* Content */}
      <div className="relative flex flex-col h-full p-5 justify-between">
        {/* Title */}
        <div>
          <p className="text-white/40 text-[10px] uppercase tracking-widest font-semibold">Líder do</p>
          <p className="text-white font-bold text-2xl leading-tight tracking-tight">período</p>
        </div>

        {/* Avatar + name */}
        <div className="flex flex-col items-start gap-3">
          <Avatar className="h-14 w-14 ring-2 ring-yellow-400/40">
            {item.avatarUrl && <AvatarImage src={item.avatarUrl} alt={item.nome} />}
            <AvatarFallback className="bg-yellow-500/20 text-yellow-300 text-lg font-bold">
              {getInitials(item.nome)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-white font-bold text-base leading-tight truncate max-w-[140px]">
              {item.nome}
            </p>
            {item.equipeNome && (
              <p className="text-white/40 text-[11px] truncate">{item.equipeNome}</p>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2">
          <StatBadge icon={<Crown className="h-3 w-3 text-yellow-400" />} value={item.pontos} label="pts" />
          <StatBadge icon={<Award className="h-3 w-3 text-blue-400" />} value={item.badges} label="badges" />
          <StatBadge icon={<Target className="h-3 w-3 text-green-400" />} value={item.metasBatidas} label="metas" />
          <StatBadge icon={<Swords className="h-3 w-3 text-purple-400" />} value={item.missoesCumpridas} label="missões" />
        </div>
      </div>
    </div>
  );
}

function StatBadge({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
}) {
  return (
    <div className="bg-white/8 rounded-lg px-2.5 py-2">
      <div className="flex items-center gap-1 mb-0.5">{icon}</div>
      <p className="text-white font-bold text-base tabular-nums leading-none">{value}</p>
      <p className="text-white/30 text-[9px] uppercase tracking-wide mt-0.5">{label}</p>
    </div>
  );
}
