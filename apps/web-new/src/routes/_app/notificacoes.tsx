import { createFileRoute } from '@tanstack/react-router';

import { useState } from 'react';
import { dayjs } from '@/core/utils/date-utils';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Filter,
  ExternalLink,
} from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Button } from '@/core/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/core/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/core/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/core/ui/tabs';
import {
  useNotificacoes,
  useNotificacoesNaoLidas,
  useMarcarNotificacaoComoLida,
  useMarcarTodasComoLidas,
  useDeleteNotification,
  useDeleteAllRead,
} from '@/modules/notificacoes/http';
import type { Notificacao } from '@/types/notificacao';
import { cn } from '@/core/utils';
import { toast } from 'sonner';

export const Route = createFileRoute('/_app/notificacoes')({
  component: NotificacoesPage,
});


function getTipoNotificacaoLabel(tipo: string): string {
  const labels: Record<string, string> = {
    venda_recusada:      'Venda Recusada',
    renovacao_expirando: 'Renovação Expirando',
    aprovacao_pendente:  'Aprovação Pendente',
    venda_aprovada:      'Venda Aprovada',
    endosso_solicitado:  'Endosso Solicitado',
    endosso_recusado:    'Endosso Recusado',
    cotacao_atribuida:   'Cotação Atribuída',
    comissao_disponivel: 'Comissão Disponível',
    gamificacao:         'Gamificação',
  };
  return labels[tipo] || tipo;
}

// Helper para formatar mensagens removendo IDs de menções
function formatarMensagem(mensagem: string): string {
  return mensagem
    .replace(/@\[([^\]]+)\]\([^)]+\)/g, '@$1')
    .replace(/@\{([^|]+)\|[^}]+\}/g, '@$1');
}

function NotificacoesPage() {
  const [filtro, setFiltro] = useState<'todas' | 'nao-lidas' | 'lidas'>(
    'todas',
  );
  const [tipoFiltro, setTipoFiltro] = useState<string>('todos');

  const { data: countNaoLidas = 0 } = useNotificacoesNaoLidas();
  const { data: notificacoes, isLoading } = useNotificacoes({
    lida:
      filtro === 'lidas' ? true : filtro === 'nao-lidas' ? false : undefined,
    tipo: tipoFiltro !== 'todos' ? tipoFiltro : undefined,
  });

  const marcarComoLida = useMarcarNotificacaoComoLida();
  const marcarTodasComoLidas = useMarcarTodasComoLidas();
  const excluirNotificacao = useDeleteNotification();
  const excluirTodasLidas = useDeleteAllRead();

  const handleMarcarComoLida = async (id: string) => {
    try {
      await marcarComoLida.mutateAsync(id);
    } catch (error) {
      toast.error('Erro ao marcar notificação como lida');
    }
  };

  const handleMarcarTodasComoLidas = async () => {
    try {
      await marcarTodasComoLidas.mutateAsync();
      toast.success('Todas as notificações foram marcadas como lidas');
    } catch (error) {
      toast.error('Erro ao marcar todas como lidas');
    }
  };

  const handleExcluir = async (id: string) => {
    try {
      await excluirNotificacao.mutateAsync(id);
      toast.success('Notificação excluída');
    } catch (error) {
      toast.error('Erro ao excluir notificação');
    }
  };

  const handleExcluirTodasLidas = async () => {
    try {
      await excluirTodasLidas.mutateAsync();
      toast.success('Todas as notificações lidas foram excluídas');
    } catch (error) {
      toast.error('Erro ao excluir notificações');
    }
  };

  const items = notificacoes?.items || [];

  return (
    <div className="space-y-6 p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold">Notificações</h1>
          <p className="text-muted-foreground">
            Você tem {countNaoLidas} notificações não lidas
          </p>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          {countNaoLidas > 0 && (
            <Button onClick={handleMarcarTodasComoLidas} variant="outline" size="sm">
              <CheckCheck className="mr-2 h-4 w-4" />
              Marcar todas como lidas
            </Button>
          )}
          <Button onClick={handleExcluirTodasLidas} variant="outline" size="sm">
            <Trash2 className="mr-2 h-4 w-4" />
            Limpar lidas
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-3">
          <Tabs value={filtro} onValueChange={(v) => setFiltro(v as any)}>
            <TabsList>
              <TabsTrigger value="todas">Todas</TabsTrigger>
              <TabsTrigger value="nao-lidas">Não lidas</TabsTrigger>
              <TabsTrigger value="lidas">Lidas</TabsTrigger>
            </TabsList>
          </Tabs>

          <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              <SelectItem value="venda_recusada">Venda Recusada</SelectItem>
              <SelectItem value="renovacao_expirando">Renovação Expirando</SelectItem>
              <SelectItem value="aprovacao_pendente">Aprovação Pendente</SelectItem>
              <SelectItem value="venda_aprovada">Venda Aprovada</SelectItem>
              <SelectItem value="endosso_solicitado">Endosso Solicitado</SelectItem>
              <SelectItem value="endosso_recusado">Endosso Recusado</SelectItem>
              <SelectItem value="cotacao_atribuida">Cotação Atribuída</SelectItem>
              <SelectItem value="comissao_disponivel">Comissão Disponível</SelectItem>
              <SelectItem value="gamificacao">Gamificação</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Lista de notificações */}
      <div className="space-y-2">
        {isLoading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Carregando...</p>
            </CardContent>
          </Card>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Bell className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">
                Nenhuma notificação encontrada
              </p>
            </CardContent>
          </Card>
        ) : (
          items.map((notificacao) => (
            <NotificationCard
              key={notificacao.id}
              notificacao={notificacao}
              onMarcarComoLida={handleMarcarComoLida}
              onExcluir={handleExcluir}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface NotificationCardProps {
  notificacao: Notificacao;
  onMarcarComoLida: (id: string) => void;
  onExcluir: (id: string) => void;
}

function NotificationCard({
  notificacao,
  onMarcarComoLida,
  onExcluir,
}: NotificationCardProps) {
  const content = (
    <Card
      className={cn(
        'group transition-colors hover:bg-accent/50',
        !notificacao.lida && 'border-primary/50 bg-accent/30',
      )}
    >
      <CardContent className="flex items-start gap-4 p-4">
        {/* Indicador de não lida */}
        {!notificacao.lida && (
          <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-primary" />
        )}

        {/* Conteúdo */}
        <div className="flex-1 space-y-1">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-semibold">{notificacao.titulo}</h3>
              <p className="text-sm text-muted-foreground">
                {formatarMensagem(notificacao.mensagem)}
              </p>
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap max-w-[80px] truncate sm:max-w-none">
              {dayjs(notificacao.createdAt).fromNow()}
            </span>
          </div>

          {/* Badge de tipo */}
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
              {getTipoNotificacaoLabel(notificacao.tipo)}
            </span>
          </div>
        </div>

        {/* Ações */}
        <div className="flex items-start gap-1 opacity-100 md:opacity-0 transition-opacity md:group-hover:opacity-100">
          {!notificacao.lida && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 sm:h-8 sm:w-8"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onMarcarComoLida(notificacao.id);
              }}
              title="Marcar como lida"
              aria-label="Marcar como lida"
            >
              <Check className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 sm:h-8 sm:w-8 text-destructive hover:text-destructive"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onExcluir(notificacao.id);
            }}
            title="Excluir"
            aria-label="Excluir notificação"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  if (notificacao.linkAcao) {
    return (
      <Link
        to={notificacao.linkAcao}
        onClick={() => onMarcarComoLida(notificacao.id)}
      >
        {content}
      </Link>
    );
  }

  return content;
}
