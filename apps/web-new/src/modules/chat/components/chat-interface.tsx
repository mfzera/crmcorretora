
import { useState, useCallback, useRef, useEffect, useTransition, Suspense } from 'react';
import { useLocation } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { lazy, Suspense as _Suspense } from 'react';
import { ChannelList } from './channel-list';
import { ChatWindow } from './chat-window';
import { Skeleton } from '@/core/ui/skeleton';

const PanelSkeleton = () => (
  <div className="p-6 space-y-4">
    <Skeleton className="h-24 w-24 rounded-full mx-auto" />
    <Skeleton className="h-5 w-32 mx-auto" />
    <Skeleton className="h-4 w-48 mx-auto" />
  </div>
);

const UserProfile = lazy(() => import('./user-profile').then((m) => ({ default: m.UserProfile })));
const ChannelProfile = lazy(() => import('./channel-profile').then((m) => ({ default: m.ChannelProfile })));
import { useChatWebSocket } from '@/core/hooks/use-chat-websocket';
import { useCanais } from '../http';
import { useIsMobile } from '@/core/hooks/use-mobile';
import {
  MessageSquare,
  WifiOff,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/core/ui/alert';
import { Button } from '@/core/ui/button';
import { Sheet, SheetContent } from '@/core/ui/sheet';

export function ChatInterface() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.searchStr ?? '');
  const [selectedCanalId, setSelectedCanalId] = useState<string | null>(null);
  const [targetMensagemId, setTargetMensagemId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showChannelProfile, setShowChannelProfile] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Map<string, Map<string, string>>>(
    new Map(),
  );
  const [showChannelList, setShowChannelList] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [profileWidth, setProfileWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<HTMLDivElement>(null);

  const [hasConnectedBefore, setHasConnectedBefore] = useState(false);
  const [, startTypingTransition] = useTransition();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const { data: canaisData, isLoading: isLoadingCanais } = useCanais();

  const handleCanalCreated = useCallback((canalId: string) => {
    setSelectedCanalId(canalId);
  }, []);

  const {
    isConnected,
    connectionError,
    sendMessage,
    markAsRead,
    startTyping,
    stopTyping,
    addReaction,
    removeReaction,
    editMessage,
    deleteMessage,
    reconnect,
  } = useChatWebSocket({
    onMessage: () => {
      // As queries são invalidadas automaticamente pelo hook
    },
    onTyping: useCallback((canalId: string, usuarioId: string, nome?: string) => {
      startTypingTransition(() => {
        setTypingUsers((prev) => {
          const newMap = new Map(prev);
          if (!newMap.has(canalId)) {
            newMap.set(canalId, new Map());
          }
          newMap.get(canalId)!.set(usuarioId, nome || 'Alguém');
          return newMap;
        });
      });
    }, [startTypingTransition]),
    onStopTyping: useCallback((canalId: string, usuarioId: string) => {
      startTypingTransition(() => {
        setTypingUsers((prev) => {
          const newMap = new Map(prev);
          if (newMap.has(canalId)) {
            newMap.get(canalId)!.delete(usuarioId);
            if (newMap.get(canalId)!.size === 0) {
              newMap.delete(canalId);
            }
          }
          return newMap;
        });
      });
    }, [startTypingTransition]),
    onUserStatus: useCallback((usuarioId: string, status: 'online' | 'offline') => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        if (status === 'online') next.add(usuarioId);
        else next.delete(usuarioId);
        return next;
      });
    }, []),
    onMessageRead: useCallback((canalId: string, _mensagemId: string, _usuarioId: string) => {
      // Atualizar cache otimisticamente ao receber confirmação de leitura
      queryClient.setQueryData(['canais'], (old: any) => {
        if (!old?.canais) return old;
        return {
          ...old,
          canais: old.canais.map((c: any) =>
            c.id === canalId ? { ...c, naoLidas: 0 } : c,
          ),
        };
      });
    }, [queryClient]),
    onError: (error) => {},
  });

  useEffect(() => {
    if (isConnected && !hasConnectedBefore) {
      setHasConnectedBefore(true);
    }
  }, [isConnected, hasConnectedBefore]);

  const canais = canaisData?.canais || [];
  const selectedCanal = canais.find((c: any) => c.id === selectedCanalId);

  // Verificar parâmetros da URL (notificações) e sessionStorage
  useEffect(() => {
    if (canais.length === 0) return;

    // Prioridade 1: Parâmetros da URL (vindo de notificações)
    const canalParam = searchParams?.get('canal');
    const mensagemParam = searchParams?.get('mensagem');

    if (canalParam) {
      const canalExiste = canais.find((c: any) => c.id === canalParam);
      if (canalExiste) {
        setSelectedCanalId(canalParam);
        if (mensagemParam) {
          setTargetMensagemId(mensagemParam);
        }
        return;
      }
    }

    // Prioridade 2: Canal compartilhado no sessionStorage
    const sharedCanalId = sessionStorage.getItem('chatShareCanalId');
    if (sharedCanalId) {
      const canalExiste = canais.find((c: any) => c.id === sharedCanalId);
      if (canalExiste) {
        setSelectedCanalId(sharedCanalId);
      }
    }
  }, [canais, searchParams]);

  // Handle resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const newWidth = window.innerWidth - e.clientX;
      if (newWidth >= 280 && newWidth <= 600) {
        setProfileWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    if (isResizing) {
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // Mobile: mostra lista OU chat, nunca os dois juntos
  const showList = isMobile ? !selectedCanalId : showChannelList;
  const showChat = isMobile ? !!selectedCanalId : true;

  return (
    <div className="flex h-full w-full overflow-hidden bg-background">
      {/* Lista de canais */}
      {showList && (
        <div className={isMobile ? 'w-full flex-shrink-0' : 'w-80 flex-shrink-0 border-r transition-all duration-300'}>
          <ChannelList
            canais={canais}
            selectedCanalId={selectedCanalId}
            onSelectCanal={setSelectedCanalId}
            isConnected={isConnected}
            isLoading={isLoadingCanais}
            onCanalCreated={handleCanalCreated}
            onToggleVisibility={() => setShowChannelList(false)}
            onlineUsers={onlineUsers}
          />
        </div>
      )}

      {/* Ícone de toggle quando lista está colapsada (desktop) */}
      {!isMobile && !showChannelList && (
        <div className="flex-shrink-0 border-r bg-background/50 flex items-center justify-center w-12">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowChannelList(true)}
            className="h-12 w-12 sm:h-10 sm:w-10"
            title="Mostrar canais"
          >
            <PanelLeftOpen className="h-5 w-5" />
          </Button>
        </div>
      )}

      {/* Janela de chat */}
      {showChat && (
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* Alerta de conexão - só aparece após ter conectado antes */}
        {hasConnectedBefore && !isConnected && (
          <Alert variant="destructive" className="m-4 mb-0">
            <WifiOff className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{connectionError || 'Desconectado do chat em tempo real'}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={reconnect}
                className="ml-3 flex-shrink-0 h-7 text-xs"
              >
                Tentar novamente
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {selectedCanal ? (
          <ChatWindow
            canal={selectedCanal}
            sendMessage={sendMessage}
            markAsRead={markAsRead}
            startTyping={startTyping}
            stopTyping={stopTyping}
            addReaction={addReaction}
            removeReaction={removeReaction}
            editMessage={editMessage}
            deleteMessage={deleteMessage}
            onViewProfile={setSelectedUserId}
            onShowChannelProfile={
              selectedCanal.tipo === 'geral'
                ? () => setShowChannelProfile(true)
                : undefined
            }
            onBack={isMobile ? () => setSelectedCanalId(null) : undefined}
            typingUsers={typingUsers.get(selectedCanal.id) || new Map()}
            isConnected={isConnected}
            targetMensagemId={targetMensagemId}
            onMensagemScrolled={() => setTargetMensagemId(null)}
            onlineUsers={onlineUsers}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full bg-background">
            <div className="flex items-center justify-center h-20 w-20 rounded-full bg-primary/10 mb-6">
              <MessageSquare className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Bem-vindo ao Chat</h3>
            <p className="text-sm text-muted-foreground max-w-sm text-center">
              Selecione um canal ou inicie uma conversa para começar a trocar
              mensagens com sua equipe em tempo real
            </p>
            {!isConnected && (
              <p className="text-xs text-destructive mt-4">
                Aguardando conexão com o servidor...
              </p>
            )}
          </div>
        )}
      </div>
      )}

      {/* Perfil do canal - desktop: side panel resizable */}
      {!isMobile && showChannelProfile &&
        selectedCanal &&
        selectedCanal.tipo === 'geral' && (
          <div
            className="flex-shrink-0 border-l animate-in slide-in-from-right relative"
            style={{
              width: `${profileWidth}px`,
              transition: isResizing ? 'none' : 'width 300ms ease-in-out',
            }}
          >
            {/* Resize handle */}
            <div
              ref={resizeRef}
              className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-primary/30 active:bg-primary/50 transition-colors z-50 group hidden md:block"
              onMouseDown={() => setIsResizing(true)}
            >
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-12 bg-border rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <Suspense fallback={<PanelSkeleton />}>
              <ChannelProfile
                canal={selectedCanal}
                onClose={() => setShowChannelProfile(false)}
                onViewMember={(usuarioId) => {
                  setShowChannelProfile(false);
                  setSelectedUserId(usuarioId);
                }}
              />
            </Suspense>
          </div>
        )}

      {/* Perfil do usuário - desktop: side panel resizable */}
      {!isMobile && selectedUserId && (
        <div
          className="flex-shrink-0 border-l animate-in slide-in-from-right relative"
          style={{
            width: `${profileWidth}px`,
            transition: isResizing ? 'none' : 'width 300ms ease-in-out',
          }}
        >
          {/* Resize handle */}
          <div
            ref={resizeRef}
            className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-primary/30 active:bg-primary/50 transition-colors z-50 group hidden md:block"
            onMouseDown={() => setIsResizing(true)}
          >
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-12 bg-border rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <Suspense fallback={<PanelSkeleton />}>
            <UserProfile
              usuarioId={selectedUserId}
              onClose={() => setSelectedUserId(null)}
            />
          </Suspense>
        </div>
      )}

      {/* Perfil do canal - mobile: Sheet */}
      {isMobile && (
        <Sheet
          open={showChannelProfile && !!selectedCanal && selectedCanal.tipo === 'geral'}
          onOpenChange={(open) => !open && setShowChannelProfile(false)}
        >
          <SheetContent side="right" className="w-[90vw] sm:w-[400px] p-0 overflow-y-auto">
            {selectedCanal && selectedCanal.tipo === 'geral' && (
              <Suspense fallback={<PanelSkeleton />}>
                <ChannelProfile
                  canal={selectedCanal}
                  onClose={() => setShowChannelProfile(false)}
                  onViewMember={(usuarioId) => {
                    setShowChannelProfile(false);
                    setSelectedUserId(usuarioId);
                  }}
                />
              </Suspense>
            )}
          </SheetContent>
        </Sheet>
      )}

      {/* Perfil do usuário - mobile: Sheet */}
      {isMobile && (
        <Sheet
          open={!!selectedUserId}
          onOpenChange={(open) => !open && setSelectedUserId(null)}
        >
          <SheetContent side="right" className="w-[90vw] sm:w-[400px] p-0 overflow-y-auto">
            {selectedUserId && (
              <Suspense fallback={<PanelSkeleton />}>
                <UserProfile
                  usuarioId={selectedUserId}
                  onClose={() => setSelectedUserId(null)}
                />
              </Suspense>
            )}
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
