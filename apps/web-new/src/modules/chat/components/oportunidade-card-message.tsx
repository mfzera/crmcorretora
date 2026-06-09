
import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/core/ui/card';
import { Badge } from '@/core/ui/badge';
import { Button } from '@/core/ui/button';
import {
  Building2,
  User,
  Flame,
  TrendingUp,
  Clock,
  Plus,
  Check,
} from 'lucide-react';
import { cn } from '@/core/utils';
import { toast } from 'sonner';
import { handleApiError } from '@/core/utils/handle-api-error';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/infra/http/api';

interface OportunidadeMetadata {
  oportunidadeId: string;
  nomeCliente: string;
  status: string;
  prioridade: string;
  temperatura: string;
  premioEstimado?: string;
  vendedor?: {
    id: string;
    nome: string;
  };
  seguradora?: {
    id: string;
    nome: string;
  };
  observacoes?: string;
}

interface OportunidadeCardMessageProps {
  metadata: OportunidadeMetadata;
  isOwn: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  lead: 'Lead',
  contato_inicial: 'Contato Inicial',
  negociacao: 'Negociação',
  ganha: 'Ganha',
  perdida: 'Perdida',
};

const PRIORIDADE_LABELS: Record<string, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
  urgente: 'Urgente',
};

const TEMPERATURA_LABELS: Record<string, string> = {
  frio: 'Frio',
  morno: 'Morno',
  quente: 'Quente',
};

export function OportunidadeCardMessage({
  metadata,
  isOwn,
}: OportunidadeCardMessageProps) {
  const [criado, setCriado] = useState(false);
  const [criando, setCriando] = useState(false);
  const queryClient = useQueryClient();

  const getPrioridadeColor = (prioridade: string) => {
    switch (prioridade) {
      case 'urgente':
        return 'bg-red-500 text-white';
      case 'alta':
        return 'bg-orange-500 text-white';
      case 'media':
        return 'bg-yellow-500 text-white';
      case 'baixa':
        return 'bg-gray-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getTemperaturaIcon = (temperatura: string) => {
    switch (temperatura) {
      case 'quente':
        return <Flame className="h-3 w-3 text-red-500" />;
      case 'morno':
        return <TrendingUp className="h-3 w-3 text-orange-500" />;
      case 'frio':
        return <Clock className="h-3 w-3 text-blue-500" />;
      default:
        return null;
    }
  };

  const criarOportunidade = useMutation({
    mutationFn: async () => {
      const response = await api.post<{ data: any }>('/opportunities', {
        nomeCliente: metadata.nomeCliente,
        status: 'lead', // Sempre começa como lead para o novo vendedor
        temperatura: metadata.temperatura,
        premioEstimado: metadata.premioEstimado,
        observacoes: metadata.observacoes
          ? `Compartilhado por ${metadata.vendedor?.nome || 'outro vendedor'}\n\n${metadata.observacoes}`
          : `Compartilhado por ${metadata.vendedor?.nome || 'outro vendedor'}`,
      });

      return response.data;
    },
    onSuccess: () => {
      setCriado(true);
      toast.success('Oportunidade criada com sucesso!');
      // Invalidar queries do kanban
      queryClient.invalidateQueries({ queryKey: ['oportunidades'] });
    },
    onError: (error: unknown) => {
      toast.error(handleApiError(error));
    },
  });

  const handleCriarCard = async () => {
    if (criado || criando) return;
    setCriando(true);
    try {
      await criarOportunidade.mutateAsync();
    } finally {
      setCriando(false);
    }
  };

  return (
    <Card className="max-w-md border-2 border-primary/20 bg-gradient-to-br from-background to-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span className="text-xs font-medium text-primary">
                Oportunidade Compartilhada
              </span>
            </div>
            <h4 className="text-base font-bold">{metadata.nomeCliente}</h4>
          </div>
          <Badge
            variant="secondary"
            className={cn('text-xs', getPrioridadeColor(metadata.prioridade))}
          >
            {PRIORIDADE_LABELS[metadata.prioridade]}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pb-4">
        {/* Informações principais */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Status:</span>
            <span className="font-medium">
              {STATUS_LABELS[metadata.status] || metadata.status}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Temperatura:</span>
            <div className="flex items-center gap-1.5">
              {getTemperaturaIcon(metadata.temperatura)}
              <span className="font-medium">
                {TEMPERATURA_LABELS[metadata.temperatura]}
              </span>
            </div>
          </div>

          {metadata.premioEstimado && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Prêmio Estimado:</span>
              <span className="font-semibold text-green-600">
                R${' '}
                {parseFloat(metadata.premioEstimado).toLocaleString('pt-BR', {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
          )}
        </div>

        {/* Divisor */}
        <div className="border-t border-border/50" />

        {/* Informações secundárias */}
        <div className="space-y-1.5">
          {metadata.seguradora && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Building2 className="h-3.5 w-3.5" />
              <span>{metadata.seguradora.nome}</span>
            </div>
          )}

          {metadata.vendedor && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <User className="h-3.5 w-3.5" />
              <span>Vendedor: {metadata.vendedor.nome}</span>
            </div>
          )}
        </div>

        {metadata.observacoes && (
          <>
            <div className="border-t border-border/50" />
            <div className="text-xs text-muted-foreground">
              <p className="line-clamp-3">{metadata.observacoes}</p>
            </div>
          </>
        )}

        {/* Botão de criar card - apenas se não for do próprio usuário */}
        {!isOwn && (
          <>
            <div className="border-t border-border/50" />
            <Button
              onClick={handleCriarCard}
              disabled={criado || criando}
              className="w-full"
              variant={criado ? 'secondary' : 'default'}
            >
              {criado ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Oportunidade Criada
                </>
              ) : criando ? (
                <>
                  <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-background border-t-transparent" />
                  Criando...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Card para Mim
                </>
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
