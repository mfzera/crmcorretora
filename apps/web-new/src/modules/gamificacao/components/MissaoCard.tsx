
import { Swords, Calendar, User, Users, Trophy } from 'lucide-react';
import { Card, CardContent } from '@/core/ui/card';
import { Progress } from '@/core/ui/progress';
import { Badge } from '@/core/ui/badge';

interface MissaoCardProps {
  missao: {
    id: string;
    titulo: string;
    descricao?: string;
    tipoMetrica: string;
    valorAlvo: string;
    dataInicio: string;
    prazo: string;
    status: string;
    progressoAtual: number;
    percentual: number;
    equipe?: { nome: string } | null;
    usuario?: { nome: string } | null;
    criadaPor?: { nome: string } | null;
    badgeTipo?: { nome: string; icone: string; cor: string } | null;
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
  PENDENTE: { label: 'Pendente', variant: 'outline' },
  EM_ANDAMENTO: { label: 'Em andamento', variant: 'default' },
  CONCLUIDA: { label: 'Concluída', variant: 'secondary' },
  EXPIRADA: { label: 'Expirada', variant: 'destructive' },
  CANCELADA: { label: 'Cancelada', variant: 'outline' },
};

function diasRestantes(prazo: string): number {
  const fim = new Date(prazo);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return Math.ceil((fim.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
}

export function MissaoCard({ missao }: MissaoCardProps) {
  const dias = diasRestantes(missao.prazo);
  const statusCfg = statusConfig[missao.status] ?? { label: missao.status, variant: 'outline' as const };
  const alvo = parseFloat(missao.valorAlvo);
  const isValorPremio = missao.tipoMetrica === 'valor_premio' || missao.tipoMetrica === 'premio_renovacao';
  const isTaxaRenovacao = missao.tipoMetrica === 'taxa_renovacao';

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
            <div className="rounded-lg bg-orange-500/10 p-1.5 shrink-0">
              <Swords className="h-4 w-4 text-orange-500" />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{missao.titulo}</p>
              <p className="text-xs text-muted-foreground">
                {metricaLabels[missao.tipoMetrica] ?? missao.tipoMetrica}
                {missao.criadaPor ? ` · por ${missao.criadaPor.nome}` : ''}
              </p>
            </div>
          </div>
          <Badge variant={statusCfg.variant} className="shrink-0 text-xs">
            {statusCfg.label}
          </Badge>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{formatValue(missao.progressoAtual)}</span>
            <span className="font-medium">{formatValue(alvo)}</span>
          </div>
          <Progress value={missao.percentual} className="h-2" />
          <p className="text-xs text-muted-foreground text-right">{missao.percentual}%</p>
        </div>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            {missao.equipe ? (
              <>
                <Users className="h-3 w-3" />
                <span>{missao.equipe.nome}</span>
              </>
            ) : missao.usuario ? (
              <>
                <User className="h-3 w-3" />
                <span>{missao.usuario.nome}</span>
              </>
            ) : (
              <span>Toda a equipe</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {missao.badgeTipo && (
              <div className="flex items-center gap-1">
                <Trophy className="h-3 w-3 text-yellow-500" />
                <span className="text-yellow-600 dark:text-yellow-400">{missao.badgeTipo.nome}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>
                {missao.status === 'PENDENTE' || missao.status === 'EM_ANDAMENTO'
                  ? dias > 0
                    ? `${dias} dia${dias !== 1 ? 's' : ''}`
                    : 'Prazo encerrado'
                  : new Date(missao.prazo).toLocaleDateString('pt-BR')}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
