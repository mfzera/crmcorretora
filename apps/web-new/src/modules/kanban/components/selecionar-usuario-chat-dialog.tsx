
import { useState } from 'react';
import { Button } from '@/core/ui/button';
import { Avatar, AvatarFallback } from '@/core/ui/avatar';
import { User } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { handleApiError } from '@/core/utils/handle-api-error';
import { useCanais, useCreateCanalDireto } from '@/modules/chat/http';
import { Skeleton } from '@/core/ui/skeleton';
import { useChatWebSocket } from '@/core/hooks/use-chat-websocket';
import { BaseDialog } from '@/core/components/shared';

interface SelecionarUsuarioChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  textoCompartilhar: string;
}

export function SelecionarUsuarioChatDialog({
  open,
  onOpenChange,
  textoCompartilhar,
}: SelecionarUsuarioChatDialogProps) {
  const navigate = useNavigate();
  const [enviando, setEnviando] = useState(false);
  
  const { data: canaisData, isLoading } = useCanais();
  const createCanalDireto = useCreateCanalDireto();
  const { sendMessage, isConnected } = useChatWebSocket();

  const canais = canaisData?.canais || [];
  // Apenas mensagens diretas - não mostrar canal geral para compartilhamento
  const canaisDiretos = canais.filter((c) => c.tipo === 'direto');

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const handleSelecionarCanal = async (canalId: string) => {
    if (!isConnected) {
      toast.error('Chat desconectado. Tente novamente.');
      return;
    }

    setEnviando(true);
    try {
      // Parse do texto para extrair metadata da oportunidade
      const metadataString = sessionStorage.getItem('oportunidadeMetadata');
      if (!metadataString) {
        throw new Error('Dados da oportunidade não encontrados');
      }
      const metadata = JSON.parse(metadataString);

      // Enviar mensagem especial de oportunidade via WebSocket
      const success = sendMessage(
        canalId,
        'Compartilhou uma oportunidade',
        undefined,
        'oportunidade',
        metadata,
      );

      if (!success) {
        throw new Error('Erro ao enviar mensagem');
      }

      // Limpar sessionStorage
      sessionStorage.removeItem('oportunidadeMetadata');

      // Redirecionar para o chat
      onOpenChange(false);
      navigate({ to: '/chat' });
      toast.success('Oportunidade compartilhada com sucesso!');
    } catch (error) {
      toast.error(handleApiError(error));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <BaseDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Compartilhar no Chat"
      description="Selecione com quem você deseja compartilhar esta oportunidade"
      size="md"
    >
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {isLoading ? (
          <>
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-[150px]" />
                  <Skeleton className="h-3 w-[100px]" />
                </div>
              </div>
            ))}
          </>
        ) : (
          <>
            {canaisDiretos.length > 0 ? (
              <>
                <div className="px-2 py-2 text-xs font-medium text-muted-foreground">
                  Selecione um usuário para compartilhar
                </div>
                {canaisDiretos.map((canal) => (
                  <Button
                    key={canal.id}
                    variant="outline"
                    className="w-full justify-start gap-3 h-auto py-3"
                    onClick={() => handleSelecionarCanal(canal.id)}
                    disabled={enviando}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {getInitials(canal.outroUsuario?.nome || 'U')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-left flex-1">
                      <p className="font-medium">{canal.outroUsuario?.nome}</p>
                      <p className="text-xs text-muted-foreground">{canal.outroUsuario?.email}</p>
                    </div>
                  </Button>
                ))}
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhum usuário disponível</p>
                <p className="text-xs mt-1">Inicie uma conversa no chat primeiro</p>
              </div>
            )}
          </>
        )}
      </div>
    </BaseDialog>
  );
}
