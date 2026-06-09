
import { useState, lazy, Suspense } from 'react';
import { Target, Calendar, Users, User, BarChart2 } from 'lucide-react';
import { Card, CardContent } from '@/core/ui/card';
import { Progress } from '@/core/ui/progress';
import { Badge } from '@/core/ui/badge';
import { Button } from '@/core/ui/button';

const MetaAuditoriaDialog = lazy(() =>
  import('./MetaAuditoriaDialog').then((m) => ({ default: m.MetaAuditoriaDialog })),
);

interface MetaProgressCardProps {
  meta: {
    id: string;
    titulo: string;
    descricao?: string;
    tipoMetrica: string;
    valorAlvo: string;
    dataInicio: string;
    dataFim: string;
    status: string;
    progressoAtual: number;
    percentual: number;
    equipeId?: string;
    usuarioId?: string;
    equipe?: { nome: string } | null;
    usuario?: { nome: string } | null;
  };
}

const metricaLabels: Record<string, string> = {
  novos_seguros: 'Novos Seguros',
  renovacoes: 'Renovações',
  cotacoes: 'Cotações',
  valor_premio: 'Prêmio (R$)',
  taxa_renovacao: 'Taxa de Renovação (%)',
  premio_renovacao: 'Prêmio Renovações (R$)',
};

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  ATIVA: { label: 'Ativa', variant: 'default' },
  CONCLUIDA: { label: 'Concluída', variant: 'secondary' },
  EXPIRADA: { label: 'Expirada', variant: 'destructive' },
  CANCELADA: { label: 'Cancelada', variant: 'outline' },
};

function diasRestantes(dataFim: string): number {
  const fim = new Date(dataFim);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return Math.ceil((fim.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
}

export function MetaProgressCard({ meta }: MetaProgressCardProps) {
  const [auditoriaOpen, setAuditoriaOpen] = useState(false);
  const dias = diasRestantes(meta.dataFim);
  const statusCfg = statusConfig[meta.status] ?? { label: meta.status, variant: 'outline' as const };
  const alvo = parseFloat(meta.valorAlvo);
  const isValorPremio = meta.tipoMetrica === 'valor_premio' || meta.tipoMetrica === 'premio_renovacao';
  const isTaxaRenovacao = meta.tipoMetrica === 'taxa_renovacao';

  const formatValue = (v: number) => {
    if (isValorPremio) return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    if (isTaxaRenovacao) return `${v}%`;
    return v.toString();
  };

  return (
    <Card className="overflow-hidden border-border/50">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="rounded-lg bg-primary/10 p-1.5 shrink-0">
              <Target className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{meta.titulo}</p>
              <p className="text-xs text-muted-foreground">
                {metricaLabels[meta.tipoMetrica] ?? meta.tipoMetrica}
              </p>
            </div>
          </div>
          <Badge variant={statusCfg.variant} className="shrink-0 text-xs">
            {statusCfg.label}
          </Badge>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{formatValue(meta.progressoAtual)}</span>
            <span className="font-medium">{formatValue(alvo)}</span>
          </div>
          <Progress value={meta.percentual} className="h-2" />
          <p className="text-xs text-muted-foreground text-right">{meta.percentual}%</p>
        </div>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            {meta.equipe ? (
              <>
                <Users className="h-3 w-3" />
                <span>{meta.equipe.nome}</span>
              </>
            ) : meta.usuario ? (
              <>
                <User className="h-3 w-3" />
                <span>{meta.usuario.nome}</span>
              </>
            ) : (
              <span>Toda a equipe</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>
                {meta.status === 'ATIVA'
                  ? dias > 0
                    ? `${dias} dia${dias !== 1 ? 's' : ''} restante${dias !== 1 ? 's' : ''}`
                    : 'Prazo encerrado'
                  : new Date(meta.dataFim).toLocaleDateString('pt-BR')}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-5 text-muted-foreground hover:text-foreground"
              title="Ver registros da meta"
              onClick={() => setAuditoriaOpen(true)}
            >
              <BarChart2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>

      <Suspense fallback={null}>
        <MetaAuditoriaDialog
          open={auditoriaOpen}
          onClose={() => setAuditoriaOpen(false)}
          meta={meta}
          missao={null}
        />
      </Suspense>
    </Card>
  );
}
