
import { Megaphone, Calendar, Building2 } from 'lucide-react';
import { Card, CardContent } from '@/core/ui/card';
import { Badge } from '@/core/ui/badge';

interface CampanhaCardProps {
  campanha: {
    id: string;
    titulo: string;
    descricao: string;
    dataInicio: string;
    dataFim: string;
    ativa: boolean;
    seguradoraParceira?: {
      nome: string;
      logoUrl?: string | null;
    } | null;
  };
}

function isAtiva(campanha: CampanhaCardProps['campanha']): boolean {
  const hoje = new Date().toISOString().split('T')[0];
  return campanha.ativa && campanha.dataInicio <= hoje && campanha.dataFim >= hoje;
}

export function CampanhaCard({ campanha }: CampanhaCardProps) {
  const ativa = isAtiva(campanha);

  return (
    <Card className="shrink-0 w-72 overflow-hidden border-border/50">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="rounded-lg bg-emerald-500/10 p-1.5 shrink-0">
              <Megaphone className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="font-medium text-sm truncate">{campanha.titulo}</p>
          </div>
          <Badge
            variant={ativa ? 'default' : 'secondary'}
            className="shrink-0 text-xs"
          >
            {ativa ? 'Ativa' : 'Encerrada'}
          </Badge>
        </div>

        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
          {campanha.descricao}
        </p>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            {campanha.seguradoraParceira ? (
              <>
                <Building2 className="h-3 w-3" />
                <span className="truncate max-w-[120px]">{campanha.seguradoraParceira.nome}</span>
              </>
            ) : (
              <span>Campanha interna</span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Calendar className="h-3 w-3" />
            <span>
              até {new Date(campanha.dataFim).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
