import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuthStore } from '@/infra/auth/auth-store';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/infra/http/api';

export type ChatMessage = {
  id: string;
  canalId: string;
  conteudo: string;
  createdAt: string;
  usuario: {
    id: string;
    nome: string;
    email: string;
    avatarUrl?: string;
    cargo?: { nomeCargo: string };
    equipe?: { nome: string };
  };
  respostaParaId?: string;
  editado?: boolean;
};

type WebSocketMessage = {
  type:
    | 'connected'
    | 'message'
    | 'typing'
    | 'stop_typing'
    | 'message_read'
    | 'user_status'
    | 'reaction_added'
    | 'reaction_removed'
    | 'message_edited'
    | 'message_deleted'
    | 'error'
    | 'pong';
  canalId?: string;
  usuarioId?: string;
  message?: string;
  data?: any;
};

type UseChatWebSocketOptions = {
  onConnected?: () => void;
  onMessage?: (message: WebSocketMessage) => void;
  onTyping?: (canalId: string, usuarioId: string, nome?: string) => void;
  onStopTyping?: (canalId: string, usuarioId: string) => void;
  onUserStatus?: (usuarioId: string, status: 'online' | 'offline') => void;
  onMessageRead?: (
    canalId: string,
    mensagemId: string,
    usuarioId: string,
  ) => void;
  onError?: (error: string) => void;
};

function playNotificationSound() {
  try {
    const AudioCtx =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.35);

    oscillator.onended = () => ctx.close();
  } catch {
    // Web Audio API não disponível
  }
}

const MAX_RECONNECT_ATTEMPTS = 5;
const INITIAL_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 30000;
const PING_INTERVAL = 25000; // 25 segundos (servidor usa 30s)

export function useChatWebSocket(options: UseChatWebSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const pingIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const reconnectAttemptsRef = useRef(0);
  const reconnectDelayRef = useRef(INITIAL_RECONNECT_DELAY);
  const intentionalCloseRef = useRef(false);
  const isMountedRef = useRef(true);
  const isConnectingRef = useRef(false);
  const { token } = useAuthStore();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  // Usar refs para callbacks para evitar dependências no useCallback
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Limpar intervalo de ping
  const clearPingInterval = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = undefined;
    }
  }, []);

  // Iniciar ping automático
  const startPing = useCallback(() => {
    clearPingInterval();

    pingIntervalRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, PING_INTERVAL);
  }, [clearPingInterval]);

  const connect = useCallback(async () => {
    if (!token) {
      setConnectionError('Token não disponível');
      return;
    }

    // Verificar se não está montado
    if (!isMountedRef.current) return;

    // Verificar se já está tentando conectar
    if (isConnectingRef.current) return;

    // Limpar timeout anterior se existir
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = undefined;
    }

    // Verificar se já tem conexão ativa
    if (wsRef.current) {
      const state = wsRef.current.readyState;
      if (state === WebSocket.OPEN || state === WebSocket.CONNECTING) return;

      // Fechar conexão antiga
      if (state !== WebSocket.CLOSED) {
        intentionalCloseRef.current = true;
        wsRef.current.close();
      }
      wsRef.current = null;
    }

    // Marcar que está conectando
    isConnectingRef.current = true;

    try {
      const wsTicketResponse = await api.post<{
        ticket: string;
        expiresIn: number;
      }>('/chat/ws-ticket');
      const wsTicket = wsTicketResponse?.ticket;

      if (!wsTicket) {
        setConnectionError('Falha ao obter ticket do chat');
        isConnectingRef.current = false;
        return;
      }

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const apiUrl =
        import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const host = apiUrl.replace(/^https?:\/\//, '').replace(/\/api$/, '');
      const wsUrl = `${protocol}//${host}/api/chat/ws?token=${encodeURIComponent(wsTicket)}`;

      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        // Verificar se ainda está montado
        if (!isMountedRef.current) {
          ws.close();
          return;
        }

        setIsConnected(true);
        setConnectionError(null);
        isConnectingRef.current = false;

        // Reset reconnect attempts on successful connection
        reconnectAttemptsRef.current = 0;
        reconnectDelayRef.current = INITIAL_RECONNECT_DELAY;

        // Iniciar ping automático
        startPing();
      };

      ws.onmessage = (event) => {
        if (!isMountedRef.current) return;

        try {
          const message: WebSocketMessage = JSON.parse(event.data);

          switch (message.type) {
            case 'connected':
              optionsRef.current.onConnected?.();
              break;

            case 'message':
              // Tocar som de notificação se a mensagem não for do próprio usuário
              if (message.data?.usuario?.id && message.data.usuario.id !== userRef.current?.id) {
                playNotificationSound();
              }

              // Inserção incremental no cache em vez de refetch completo
              if (message.canalId && message.data) {
                queryClient.setQueryData(
                  ['mensagens', message.canalId],
                  (old: any) => {
                    if (!old?.mensagens) return old;
                    // Evitar duplicatas (WS pode reenviar)
                    if (old.mensagens.some((m: any) => m.id === message.data.id)) {
                      return old;
                    }
                    return {
                      ...old,
                      mensagens: [...old.mensagens, message.data],
                    };
                  },
                );
                // Atualizar sidebar (última mensagem + contadores)
                queryClient.invalidateQueries({ queryKey: ['canais'] });
              }
              optionsRef.current.onMessage?.(message);
              break;

            case 'typing':
              if (message.canalId && message.usuarioId) {
                optionsRef.current.onTyping?.(
                  message.canalId,
                  message.usuarioId,
                  message.data?.nome,
                );
              }
              break;

            case 'stop_typing':
              if (message.canalId && message.usuarioId) {
                optionsRef.current.onStopTyping?.(
                  message.canalId,
                  message.usuarioId,
                );
              }
              break;

            case 'message_read':
              if (message.canalId && message.data) {
                optionsRef.current.onMessageRead?.(
                  message.canalId,
                  message.data.mensagemId,
                  message.data.usuarioId,
                );
                // Atualizar contadores de não lidas
                queryClient.invalidateQueries({ queryKey: ['canais'] });
              }
              break;

            case 'user_status':
              if (message.usuarioId && message.data) {
                optionsRef.current.onUserStatus?.(
                  message.usuarioId,
                  message.data.status,
                );
              }
              break;

            case 'error':
              const errorMsg = message.message || 'Erro desconhecido';
              setConnectionError(errorMsg);
              optionsRef.current.onError?.(errorMsg);
              toast.error(`Erro no chat: ${errorMsg}`);
              break;

            case 'reaction_added':
            case 'reaction_removed':
              if (message.canalId && message.data?.mensagemId && message.data?.reacoes) {
                queryClient.setQueryData(
                  ['mensagens', message.canalId],
                  (old: any) => {
                    if (!old?.mensagens) return old;
                    return {
                      ...old,
                      mensagens: old.mensagens.map((m: any) =>
                        m.id === message.data.mensagemId
                          ? { ...m, reacoes: message.data.reacoes }
                          : m,
                      ),
                    };
                  },
                );
              }
              break;

            case 'message_edited':
              if (message.canalId && message.data) {
                queryClient.setQueryData(
                  ['mensagens', message.canalId],
                  (old: any) => {
                    if (!old?.mensagens) return old;
                    return {
                      ...old,
                      mensagens: old.mensagens.map((m: any) =>
                        m.id === message.data.id ? { ...m, ...message.data } : m,
                      ),
                    };
                  },
                );
              }
              break;

            case 'message_deleted':
              if (message.canalId && message.data?.mensagemId) {
                queryClient.setQueryData(
                  ['mensagens', message.canalId],
                  (old: any) => {
                    if (!old?.mensagens) return old;
                    return {
                      ...old,
                      mensagens: old.mensagens.filter(
                        (m: any) => m.id !== message.data.mensagemId,
                      ),
                    };
                  },
                );
              }
              break;

            case 'pong':
              // Resposta ao ping - conexão está viva
              break;

            default:
              // Tipo de mensagem desconhecido
              break;
          }
        } catch {
          // Erro ao processar mensagem do WebSocket
        }
      };

      ws.onerror = () => {
        // Ignorar erro se foi fechamento intencional ou não está montado
        if (intentionalCloseRef.current || !isMountedRef.current) {
          return;
        }
        setConnectionError('Erro de conexão');
        isConnectingRef.current = false;
      };

      ws.onclose = (event) => {
        setIsConnected(false);
        clearPingInterval();
        isConnectingRef.current = false;

        // Se não está mais montado ou foi fechamento intencional, não reconectar
        if (!isMountedRef.current || intentionalCloseRef.current) {
          intentionalCloseRef.current = false;
          return;
        }

        // Se excedeu tentativas máximas, parar de tentar
        if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
          setConnectionError('Não foi possível conectar ao chat');
          toast.error('Não foi possível reconectar ao chat');
          return;
        }

        // Se foi erro de autenticação (código 1008), não tentar reconectar
        if (event.code === 1008) {
          setConnectionError('Sessão expirada');
          toast.error('Sessão expirada. Faça login novamente.');
          return;
        }

        // Incrementar tentativas e calcular delay exponencial
        reconnectAttemptsRef.current += 1;
        const delay = Math.min(
          reconnectDelayRef.current *
            Math.pow(2, reconnectAttemptsRef.current - 1),
          MAX_RECONNECT_DELAY,
        );

        setConnectionError(`Reconectando...`);

        reconnectTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            void connect();
          }
        }, delay);
      };

      wsRef.current = ws;
    } catch {
      setConnectionError('Erro ao conectar');
      isConnectingRef.current = false;
    }
  }, [token, queryClient, startPing, clearPingInterval]);

  useEffect(() => {
    // Marcar como montado
    isMountedRef.current = true;

    // Conectar apenas se não houver conexão
    if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
      void connect();
    }

    return () => {
      // Marcar como desmontado
      isMountedRef.current = false;
      intentionalCloseRef.current = true;
      isConnectingRef.current = false;

      // Limpar timeouts
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = undefined;
      }

      clearPingInterval();

      // Fechar WebSocket
      if (wsRef.current) {
        const state = wsRef.current.readyState;
        if (state === WebSocket.OPEN || state === WebSocket.CONNECTING) {
          wsRef.current.close();
        }
        wsRef.current = null;
      }
    };
  }, [connect, clearPingInterval]);

  const sendMessage = useCallback(
    (
      canalId: string,
      conteudo: string,
      respostaParaId?: string,
      tipo?: 'texto' | 'sistema' | 'arquivo' | 'oportunidade',
      metadata?: any,
    ) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        toast.error('Chat desconectado. Reconectando...');
        return false;
      }

      try {
        wsRef.current.send(
          JSON.stringify({
            type: 'send_message',
            canalId,
            conteudo,
            respostaParaId,
            tipoMensagem: tipo,
            metadata,
          }),
        );
        return true;
      } catch {
        toast.error('Erro ao enviar mensagem');
        return false;
      }
    },
    [],
  );

  const markAsRead = useCallback((mensagemId: string, canalId?: string) => {
    // Fast path: enviar via WS se disponível
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({ type: 'mark_read', mensagemId }));
      } catch {
        // Fallback para REST abaixo
      }
    }

    // Durable path: sempre persistir via REST
    if (canalId) {
      api.post(`/chat/${canalId}/mark-read`, { mensagemId }).catch(() => {
        // Silenciar erro — o WS pode ter persistido
      });
    }

    return true;
  }, []);

  const startTyping = useCallback((canalId: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return false;
    }
    try {
      wsRef.current.send(JSON.stringify({ type: 'typing', canalId }));
      return true;
    } catch {
      return false;
    }
  }, []);

  const stopTyping = useCallback((canalId: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return false;
    }
    try {
      wsRef.current.send(JSON.stringify({ type: 'stop_typing', canalId }));
      return true;
    } catch {
      return false;
    }
  }, []);

  const addReaction = useCallback((mensagemId: string, emoji: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      toast.error('Chat desconectado');
      return false;
    }
    try {
      wsRef.current.send(
        JSON.stringify({ type: 'add_reaction', mensagemId, emoji }),
      );
      return true;
    } catch {
      toast.error('Erro ao adicionar reação');
      return false;
    }
  }, []);

  const removeReaction = useCallback((mensagemId: string, emoji: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      toast.error('Chat desconectado');
      return false;
    }
    try {
      wsRef.current.send(
        JSON.stringify({ type: 'remove_reaction', mensagemId, emoji }),
      );
      return true;
    } catch {
      toast.error('Erro ao remover reação');
      return false;
    }
  }, []);

  const editMessage = useCallback((mensagemId: string, conteudo: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      toast.error('Chat desconectado');
      return false;
    }
    try {
      wsRef.current.send(
        JSON.stringify({ type: 'edit_message', mensagemId, conteudo }),
      );
      return true;
    } catch {
      toast.error('Erro ao editar mensagem');
      return false;
    }
  }, []);

  const deleteMessage = useCallback((mensagemId: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      toast.error('Chat desconectado');
      return false;
    }
    try {
      wsRef.current.send(
        JSON.stringify({ type: 'delete_message', mensagemId }),
      );
      return true;
    } catch {
      toast.error('Erro ao excluir mensagem');
      return false;
    }
  }, []);

  const resetAndReconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    reconnectDelayRef.current = INITIAL_RECONNECT_DELAY;
    setConnectionError(null);
    void connect();
  }, [connect]);

  return {
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
    reconnect: resetAndReconnect,
  };
}
