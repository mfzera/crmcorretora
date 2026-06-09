
import { Link } from '@tanstack/react-router';
import { ArrowLeft, Crown, Medal, ListChecks } from 'lucide-react';
import { Button } from '@/core/ui/button';
import { Badge } from '@/core/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/core/ui/avatar';
import { cn } from '@/core/utils';
import { getIniciais } from '../metricas-utils';

interface VendedorItensHeaderProps {
  vendedorNome: string;
  equipeNome?: string | null;
  avatarUrl?: string | null;
  posicaoRanking?: number | null;
}

export function VendedorItensHeader({
  vendedorNome,
  equipeNome,
  avatarUrl,
  posicaoRanking,
}: VendedorItensHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" asChild className="gap-2 shrink-0">
          <Link to="/metricas">
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline">Métricas</span>
          </Link>
        </Button>

        <Avatar className="size-11 shrink-0">
          {avatarUrl && <AvatarImage src={avatarUrl} alt={vendedorNome} />}
          <AvatarFallback className="text-sm font-bold bg-primary/10 text-primary">
            {vendedorNome ? getIniciais(vendedorNome) : '?'}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold truncate">{vendedorNome}</h1>
            {posicaoRanking && posicaoRanking <= 3 && (
              <Badge
                variant="outline"
                className={cn(
                  'gap-1 shrink-0',
                  posicaoRanking === 1 &&
                    'border-yellow-300 bg-yellow-50 text-yellow-700 dark:border-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-300',
                  posicaoRanking === 2 &&
                    'border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-950/30 dark:text-slate-300',
                  posicaoRanking === 3 &&
                    'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-300',
                )}
              >
                {posicaoRanking === 1 ? (
                  <Crown className="size-3" />
                ) : (
                  <Medal className="size-3" />
                )}
                {posicaoRanking}° Lugar
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {equipeNome ?? 'Sem equipe'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-1.5 rounded-lg border bg-muted/30 px-3 py-1.5">
          <ListChecks className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">Todos os itens</span>
        </div>
      </div>
    </div>
  );
}
