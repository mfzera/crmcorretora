
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Hash, Send, Loader2, AlertCircle, Info, ChevronLeft, ArrowDown, Reply, X } from 'lucide-react';
import { Button } from '@/core/ui/button';
import { Textarea } from '@/core/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/core/ui/avatar';
import { Alert, AlertDescription } from '@/core/ui/alert';
import { Skeleton } from '@/core/ui/skeleton';
import { MessageItem } from './message-item';
import { MentionAutocomplete } from './mention-autocomplete';
import { useMensagens } from '../http';
import { useAuthStore } from '@/infra/auth/auth-store';
import { type Canal } from '../http';
import { type Mensagem as MensagemType } from './message-item';
import { useVirtualizer } from '@tanstack/react-virtual';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';

dayjs.locale('pt-br');

type ChatWindowProps = {
  canal: Canal;
  sendMessage: (canalId: string, conteudo: string, respostaParaId?: string) => boolean;
  markAsRead: (mensagemId: string, canalId?: string) => boolean;
  startTyping: (canalId: string) => boolean;
  stopTyping: (canalId: string) => boolean;
  addReaction: (mensagemId: string, emoji: string) => boolean;
  removeReaction: (mensagemId: string, emoji: string) => boolean;
  editMessage: (mensagemId: string, conteudo: string) => boolean;
  deleteMessage: (mensagemId: string) => boolean;
  onViewProfile: (usuarioId: string) => void;
  onShowChannelProfile?: () => void;
  onBack?: () => void;
  typingUsers: Map<string, string>;
  isConnected: boolean;
  targetMensagemId?: string | null;
  onMensagemScrolled?: () => void;
  onlineUsers?: Set<string>;
};

export function ChatWindow({
  canal,
  sendMessage,
  markAsRead,
  startTyping,
  stopTyping,
  addReaction,
  removeReaction,
  editMessage,
  deleteMessage,
  onViewProfile,
  onShowChannelProfile,
  onBack,
  typingUsers,
  isConnected,
  targetMensagemId,
  onMensagemScrolled,
  onlineUsers = new Set(),
}: ChatWindowProps) {
  const [mensagem, setMensagem] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [newMessagesCount, setNewMessagesCount] = useState(0);
  const [replyingTo, setReplyingTo] = useState<MensagemType | null>(null);
  const [showMentionAutocomplete, setShowMentionAutocomplete] = useState(false);
  const [mentionSearchTerm, setMentionSearchTerm] = useState('');
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [autocompletePosition, setAutocompletePosition] = useState({
    top: 0,
    left: 0,
  });
  const parentRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const lastMessageCountRef = useRef(0);
  const isUserScrollingRef = useRef(false);
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const measuredHeightsCache = useRef(new Map<string, number>());

  const { data: mensagensData, isLoading } = useMensagens(canal.id);
  const mensagens = mensagensData?.mensagens || [];

  // Estimar tamanho baseado no cache ou usar valor padrão inteligente
  const estimateSize = useCallback(
    (index: number) => {
      const msg = mensagens[index];
      if (!msg) return 72;

      // Verificar cache primeiro
      const cached = measuredHeightsCache.current.get(msg.id);
      if (cached) return cached;

      // Estimativa inteligente baseada no conteúdo
      const contentLength = msg.conteudo?.length || 0;
      const hasReactions = (msg.reacoes?.length || 0) > 0;
      const isFirst =
        index === 0 || mensagens[index - 1]?.usuarioId !== msg.usuarioId;

      // Base: 48px para mensagem simples
      let estimated = 48;

      // Adicionar altura para avatar/nome se for primeira mensagem do grupo
      if (isFirst) estimated += 24;

      // Adicionar altura baseada no comprimento do texto (aprox 60 chars por linha)
      const lines = Math.ceil(contentLength / 60);
      if (lines > 1) estimated += (lines - 1) * 20;

      // Adicionar altura para reações
      if (hasReactions) estimated += 28;

      // Adicionar margem para separador de data potencial
      const prevMsg = mensagens[index - 1];
      if (
        index === 0 ||
        (prevMsg &&
          !dayjs(msg.createdAt).isSame(dayjs(prevMsg.createdAt), 'day'))
      ) {
        estimated += 40;
      }

      return estimated;
    },
    [mensagens],
  );

  // Configurar virtualização otimizada
  const virtualizer = useVirtualizer({
    count: mensagens.length,
    getScrollElement: () => parentRef.current,
    estimateSize,
    overscan: 8, // Aumentar overscan para scroll mais suave
    getItemKey: useCallback(
      (index: number) => mensagens[index]?.id || index,
      [mensagens],
    ),
  });

  // Detectar se usuário está scrollando manualmente
  const handleScroll = useCallback(() => {
    if (!parentRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = parentRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    // Se está a menos de 100px do final, ativar auto-scroll
    const isNearBottom = distanceFromBottom < 100;

    if (!isUserScrollingRef.current) {
      setShouldAutoScroll(isNearBottom);
      if (isNearBottom) {
        setNewMessagesCount(0);
      }
    }
  }, []);

  // Auto scroll inteligente para última mensagem
  useEffect(() => {
    const messageCount = mensagens.length;
    const prevCount = lastMessageCountRef.current;

    // Nova mensagem chegou
    if (messageCount > prevCount && messageCount > 0) {
      const lastMsg = mensagens[messageCount - 1];
      const isOwnMessage = lastMsg?.usuarioId === user?.id;

      // Scroll automático se:
      // 1. É própria mensagem do usuário
      // 2. Ou está próximo do final (shouldAutoScroll)
      if (isOwnMessage || shouldAutoScroll) {
        setNewMessagesCount(0);
        requestAnimationFrame(() => {
          virtualizer.scrollToIndex(messageCount - 1, {
            align: 'end',
            behavior: prevCount === 0 ? 'auto' : 'smooth',
          });
        });
      } else {
        // Usuário está longe do final — incrementar contador
        setNewMessagesCount((prev) => prev + (messageCount - prevCount));
      }
    }

    lastMessageCountRef.current = messageCount;
  }, [mensagens.length, mensagens, user?.id, shouldAutoScroll, virtualizer]);

  // Reset estado quando mudar de canal (sem depender de mensagens.length)
  const prevCanalIdRef = useRef(canal.id);
  useEffect(() => {
    if (prevCanalIdRef.current !== canal.id) {
      prevCanalIdRef.current = canal.id;
      setShouldAutoScroll(true);
      lastMessageCountRef.current = 0;
    }
  }, [canal.id]);

  // Scroll para o final na primeira carga de mensagens de um canal
  const hasScrolledInitialRef = useRef(false);
  useEffect(() => {
    // Reset flag ao trocar de canal
    hasScrolledInitialRef.current = false;
  }, [canal.id]);
  useEffect(() => {
    if (!hasScrolledInitialRef.current && mensagens.length > 0) {
      hasScrolledInitialRef.current = true;
      lastMessageCountRef.current = mensagens.length;
      requestAnimationFrame(() => {
        virtualizer.scrollToIndex(mensagens.length - 1, {
          align: 'end',
          behavior: 'auto',
        });
      });
    }
  }, [mensagens.length, virtualizer]);

  // Rolar até mensagem específica (de notificações)
  useEffect(() => {
    if (targetMensagemId && mensagens.length > 0) {
      const targetIndex = mensagens.findIndex((m) => m.id === targetMensagemId);
      if (targetIndex !== -1) {
        requestAnimationFrame(() => {
          virtualizer.scrollToIndex(targetIndex, {
            align: 'center',
            behavior: 'smooth',
          });
          // Notificar que rolamos até a mensagem
          onMensagemScrolled?.();
        });
      }
    }
  }, [targetMensagemId, mensagens, virtualizer, onMensagemScrolled]);

  // Marcar mensagens como lidas quando o canal muda ou novas mensagens chegam
  useEffect(() => {
    if (mensagens.length > 0) {
      // Busca a última mensagem de outro usuário (não do usuário logado)
      const ultimaMensagemDeOutro = [...mensagens]
        .reverse()
        .find((m) => m.usuarioId !== user?.id);

      if (ultimaMensagemDeOutro?.id) {
        // Atualização otimista: zerar naoLidas no cache imediatamente
        queryClient.setQueryData(['canais'], (old: any) => {
          if (!old?.canais) return old;
          return {
            ...old,
            canais: old.canais.map((c: any) =>
              c.id === canal.id ? { ...c, naoLidas: 0 } : c,
            ),
          };
        });

        // Persistir via dual-path (WS + REST)
        markAsRead(ultimaMensagemDeOutro.id, canal.id);
      }
    }
  }, [mensagens, canal.id, user?.id, markAsRead, queryClient]);

  // Verificar se há texto compartilhado de outras páginas
  useEffect(() => {
    const sharedText = sessionStorage.getItem('chatShareText');
    const sharedCanalId = sessionStorage.getItem('chatShareCanalId');

    // Se tem texto compartilhado e é para este canal
    if (sharedText && sharedCanalId === canal.id) {
      setMensagem(sharedText);
      sessionStorage.removeItem('chatShareText');
      sessionStorage.removeItem('chatShareCanalId');
    }
  }, [canal.id]);

  const handleSendMessage = useCallback(async () => {
    if (!mensagem.trim() || isSending || !isConnected) return;

    setIsSending(true);
    const success = sendMessage(canal.id, mensagem, replyingTo?.id);

    if (success) {
      setMensagem('');
      setReplyingTo(null);
      stopTyping(canal.id);
      setIsTyping(false);
      setShouldAutoScroll(true);
    }

    setIsSending(false);
  }, [mensagem, isSending, isConnected, sendMessage, canal.id, stopTyping, replyingTo]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      const cursorPosition = e.target.selectionStart || 0;

      setMensagem(value);

      // Detectar menções (@)
      const textBeforeCursor = value.substring(0, cursorPosition);
      const lastAtSymbol = textBeforeCursor.lastIndexOf('@');

      if (lastAtSymbol !== -1) {
        // Verificar se há espaço antes do @ (ou é início da string)
        const charBeforeAt =
          lastAtSymbol > 0 ? textBeforeCursor[lastAtSymbol - 1] : ' ';
        const isValidMentionStart =
          charBeforeAt === ' ' || charBeforeAt === '\n';

        if (isValidMentionStart) {
          const textAfterAt = textBeforeCursor.substring(lastAtSymbol + 1);
          // Verificar se não há espaço após @
          const hasSpaceAfter = textAfterAt.includes(' ');

          if (!hasSpaceAfter) {
            setMentionSearchTerm(textAfterAt);
            setMentionStartIndex(lastAtSymbol);
            setShowMentionAutocomplete(true);

            // Calcular posição do autocomplete (acima do input)
            if (inputRef.current) {
              const rect = inputRef.current.getBoundingClientRect();
              // Calcular distância do bottom da viewport + espaço para o autocomplete
              const distanceFromBottom = window.innerHeight - rect.top + 10;
              setAutocompletePosition({
                top: distanceFromBottom, // distância do bottom
                left: rect.left,
              });
            }
          } else {
            setShowMentionAutocomplete(false);
          }
        } else {
          setShowMentionAutocomplete(false);
        }
      } else {
        setShowMentionAutocomplete(false);
      }

      if (!isConnected) return;

      // Gerenciar indicador de digitando
      if (!isTyping && value.trim()) {
        setIsTyping(true);
        startTyping(canal.id);
      }

      // Reset timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        stopTyping(canal.id);
        setIsTyping(false);
      }, 3000);
    },
    [isConnected, isTyping, startTyping, stopTyping, canal.id],
  );

  const handleMentionSelect = useCallback(
    (userId: string, userName: string) => {
      if (mentionStartIndex === -1) return;

      const before = mensagem.substring(0, mentionStartIndex);
      const after = mensagem.substring(
        mentionStartIndex + mentionSearchTerm.length + 1,
      );
      const mention = `@[${userName}](${userId})`;

      const newMessage = before + mention + ' ' + after;

      setMensagem(newMessage);
      setShowMentionAutocomplete(false);
      setMentionStartIndex(-1);
      setMentionSearchTerm('');

      // Focar de volta no input
      inputRef.current?.focus();
    },
    [mensagem, mentionStartIndex, mentionSearchTerm],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Se autocomplete está aberto, ESC fecha
      if (e.key === 'Escape' && showMentionAutocomplete) {
        e.preventDefault();
        setShowMentionAutocomplete(false);
        return;
      }

      if (e.key === 'Enter' && !e.shiftKey && !showMentionAutocomplete) {
        e.preventDefault();
        handleSendMessage();
      }
    },
    [handleSendMessage, showMentionAutocomplete],
  );

  // Limpar timeout ao desmontar
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const getInitials = useCallback((name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }, []);

  // Filtrar usuários digitando (excluir usuário atual) - memoizado
  const otherTypingUsers = useMemo(() => {
    const entries: { id: string; nome: string }[] = [];
    typingUsers.forEach((nome, id) => {
      if (id !== user?.id) entries.push({ id, nome });
    });
    return entries;
  }, [typingUsers, user?.id]);

  // Formatar data do separador - memoizado
  const getDateLabel = useCallback((date: string) => {
    const msgDate = dayjs(date);
    const today = dayjs();
    const yesterday = dayjs().subtract(1, 'day');

    if (msgDate.isSame(today, 'day')) {
      return 'Hoje';
    } else if (msgDate.isSame(yesterday, 'day')) {
      return 'Ontem';
    } else if (msgDate.isAfter(today.subtract(7, 'day'))) {
      return msgDate.format('dddd');
    } else {
      return msgDate.format('DD/MM/YYYY');
    }
  }, []);

  // Callback para medir elemento e cachear altura
  const measureElement = useCallback(
    (element: HTMLElement | null) => {
      if (element) {
        const index = Number(element.dataset.index);
        const msg = mensagens[index];
        if (msg) {
          const height = element.getBoundingClientRect().height;
          if (height > 0) {
            measuredHeightsCache.current.set(msg.id, height);
          }
        }
        virtualizer.measureElement(element);
      }
    },
    [mensagens, virtualizer],
  );

  return (
    <div className="flex flex-col h-full min-h-0 bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b bg-card">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack} className="flex-shrink-0">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}
        {canal.tipo === 'geral' ? (
          <>
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10 text-primary">
              <Hash className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-base">{canal.nome}</h3>
              <p className="text-xs text-muted-foreground">
                {canal.descricao || 'Canal da equipe'}
              </p>
            </div>
            {onShowChannelProfile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onShowChannelProfile}
                title="Informações do canal"
              >
                <Info className="h-4 w-4" />
              </Button>
            )}
          </>
        ) : (
          <>
            <div
              className="relative cursor-pointer"
              onClick={() => canal.outroUsuario && onViewProfile(canal.outroUsuario.id)}
            >
              <Avatar className="h-10 w-10 ring-2 ring-primary/20 transition-all hover:ring-primary/40">
                {canal.outroUsuario?.avatarUrl && (
                  <AvatarImage src={canal.outroUsuario.avatarUrl} alt={canal.outroUsuario.nome} />
                )}
                <AvatarFallback className="bg-primary/10 text-primary">
                  {getInitials(canal.outroUsuario?.nome || 'U')}
                </AvatarFallback>
              </Avatar>
              {canal.outroUsuario?.id && (
                <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full ring-2 ring-background ${onlineUsers.has(canal.outroUsuario.id) ? 'bg-green-500' : 'bg-zinc-400'}`} />
              )}
            </div>
            <div className="flex-1">
              <h3
                className="font-semibold text-base cursor-pointer hover:text-primary transition-colors"
                onClick={() => canal.outroUsuario && onViewProfile(canal.outroUsuario.id)}
              >
                {canal.outroUsuario?.nome}
              </h3>
              <div className="flex items-center gap-1.5">
                {canal.outroUsuario?.id && onlineUsers.has(canal.outroUsuario.id) ? (
                  <>
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    <p className="text-xs text-green-600 dark:text-green-400 font-medium">Online</p>
                  </>
                ) : (
                  <>
                    <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
                    <p className="text-xs text-muted-foreground">Offline</p>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Alerta de desconexão */}
      {!isConnected && (
        <Alert variant="destructive" className="m-4 mb-0">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Você está offline. Aguarde a reconexão para enviar mensagens.
          </AlertDescription>
        </Alert>
      )}

      {/* Mensagens */}
      <div className="relative flex-1 min-h-0">
      <div
        ref={parentRef}
        className="h-full overflow-y-auto scrollbar-thin"
        data-lenis-prevent
        onScroll={handleScroll}
      >
        {isLoading ? (
          <div className="px-4 pt-6 space-y-6">
            {[
              { isOwn: false, widths: ['w-48', 'w-64'] },
              { isOwn: true, widths: ['w-52'] },
              { isOwn: false, widths: ['w-72'] },
              { isOwn: true, widths: ['w-40', 'w-56'] },
              { isOwn: false, widths: ['w-60'] },
              { isOwn: true, widths: ['w-44'] },
            ].map((item, i) => (
              <div
                key={i}
                className={`flex gap-2 mt-6 ${item.isOwn ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <Skeleton className="h-8 w-8 rounded-full flex-shrink-0 mt-1" />
                <div className={`flex flex-col gap-1.5 ${item.isOwn ? 'items-end' : 'items-start'}`}>
                  {!item.isOwn && <Skeleton className="h-3 w-24 mb-0.5" />}
                  {item.widths.map((w, j) => (
                    <Skeleton key={j} className={`h-9 rounded-2xl ${w}`} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : mensagens.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="flex items-center justify-center h-16 w-16 rounded-full bg-muted mb-4">
              {canal.tipo === 'geral' ? (
                <Hash className="h-8 w-8 text-muted-foreground" />
              ) : (
                <Avatar className="h-16 w-16">
                  {canal.outroUsuario?.avatarUrl && (
                    <AvatarImage src={canal.outroUsuario.avatarUrl} alt={canal.outroUsuario.nome} />
                  )}
                  <AvatarFallback className="text-lg">
                    {getInitials(canal.outroUsuario?.nome || 'U')}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
            <h4 className="font-semibold mb-2">
              {canal.tipo === 'geral'
                ? `Bem-vindo ao #${canal.nome}`
                : `Conversa com ${canal.outroUsuario?.nome}`}
            </h4>
            <p className="text-sm text-muted-foreground max-w-md">
              Nenhuma mensagem ainda. Seja o primeiro a enviar uma mensagem!
            </p>
          </div>
        ) : (
          <div
            style={{
              height: `${virtualizer.getTotalSize() + 24}px`, // +24px para espaçamento no final
              width: '100%',
              position: 'relative',
              paddingBottom: '24px',
            }}
          >
            {virtualizer.getVirtualItems().map((virtualItem) => {
              const index = virtualItem.index;
              const msg = mensagens[index];
              const prevMsg = mensagens[index - 1];

              const showAvatar =
                index === 0 ||
                prevMsg?.usuarioId !== msg.usuarioId ||
                dayjs(msg.createdAt).diff(dayjs(prevMsg?.createdAt), 'minute') >
                  5;

              // Verificar se precisa mostrar separador de data
              const showDateSeparator =
                index === 0 ||
                !dayjs(msg.createdAt).isSame(dayjs(prevMsg?.createdAt), 'day');

              return (
                <div
                  key={virtualItem.key}
                  data-index={index}
                  ref={measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                >
                  {showDateSeparator && (
                    <div className="flex items-center gap-3 my-4">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-xs font-medium text-muted-foreground px-2 py-1 bg-muted rounded-full">
                        {getDateLabel(msg.createdAt)}
                      </span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                  )}
                  <div className="px-4">
                    <MessageItem
                      mensagem={msg}
                      showAvatar={showAvatar}
                      isOwn={msg.usuarioId === user?.id}
                      currentUserId={user?.id}
                      onViewProfile={onViewProfile}
                      onAddReaction={addReaction}
                      onRemoveReaction={removeReaction}
                      onEdit={editMessage}
                      onDelete={deleteMessage}
                      onReply={setReplyingTo}
                      isHighlighted={msg.id === targetMensagemId}
                    />
                  </div>
                </div>
              );
            })}

            {/* Indicador de digitação */}
            {otherTypingUsers.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: `${virtualizer.getTotalSize()}px`,
                  left: 0,
                  width: '100%',
                  padding: '8px 0',
                }}
              >
                <div className="flex gap-3 items-center text-sm text-muted-foreground italic">
                  <div className="w-9" />
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <span
                        className="inline-block w-2 h-2 bg-primary rounded-full animate-bounce"
                        style={{ animationDelay: '0ms' }}
                      />
                      <span
                        className="inline-block w-2 h-2 bg-primary rounded-full animate-bounce"
                        style={{ animationDelay: '150ms' }}
                      />
                      <span
                        className="inline-block w-2 h-2 bg-primary rounded-full animate-bounce"
                        style={{ animationDelay: '300ms' }}
                      />
                    </div>
                    <span>
                      {otherTypingUsers.length === 1
                        ? `${otherTypingUsers[0].nome} está digitando...`
                        : otherTypingUsers.length === 2
                          ? `${otherTypingUsers[0].nome} e ${otherTypingUsers[1].nome} estão digitando...`
                          : `${otherTypingUsers[0].nome} e mais ${otherTypingUsers.length - 1} estão digitando...`}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* FAB: novas mensagens */}
      {newMessagesCount > 0 && !shouldAutoScroll && (
        <button
          onClick={() => {
            setNewMessagesCount(0);
            setShouldAutoScroll(true);
            virtualizer.scrollToIndex(mensagens.length - 1, {
              align: 'end',
              behavior: 'smooth',
            });
          }}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-all text-sm font-medium animate-in fade-in-50 slide-in-from-bottom-2"
        >
          <ArrowDown className="h-4 w-4" />
          {newMessagesCount === 1
            ? '1 nova mensagem'
            : `${newMessagesCount} novas mensagens`}
        </button>
      )}
      </div>

      {/* Input de mensagem */}
      <div className="border-t bg-card relative">
        {/* Barra de reply */}
        {replyingTo && (
          <div className="flex items-center gap-2 px-4 py-2 bg-muted/60 border-b text-sm">
            <Reply className="h-3.5 w-3.5 text-primary flex-shrink-0" />
            <span className="text-muted-foreground">Respondendo a</span>
            <span className="font-medium text-foreground truncate flex-1">
              {replyingTo.usuario?.nome}:{' '}
              <span className="font-normal text-muted-foreground">
                {replyingTo.conteudo?.replace(/@\[([^\]]+)\]\([^)]+\)/g, '@$1').slice(0, 60)}
                {(replyingTo.conteudo?.length || 0) > 60 ? '...' : ''}
              </span>
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 flex-shrink-0"
              onClick={() => setReplyingTo(null)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        <div className="px-6 py-4 relative">
        {/* Autocomplete de menções */}
        {showMentionAutocomplete && (
          <MentionAutocomplete
            canalId={canal.id}
            searchTerm={mentionSearchTerm}
            onSelect={handleMentionSelect}
            position={autocompletePosition}
          />
        )}

        <div className="flex gap-2">
          <Textarea
            ref={inputRef}
            placeholder={`Mensagem em ${canal.tipo === 'geral' ? '#' + canal.nome : canal.outroUsuario?.nome}`}
            value={mensagem}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            disabled={isSending || !isConnected}
            rows={1}
            className="flex-1 focus-visible:ring-primary min-h-[40px] max-h-[120px] resize-none py-2"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!mensagem.trim() || isSending || !isConnected}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        {isTyping && isConnected && (
          <p className="text-xs text-muted-foreground mt-2">Digitando...</p>
        )}
        </div>
      </div>
    </div>
  );
}
