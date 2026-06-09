
import { useState, memo, useCallback, useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/core/ui/avatar';
import { Button } from '@/core/ui/button';
import { Input } from '@/core/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/core/ui/dropdown-menu';
import { cn } from '@/core/utils';
import dayjs from 'dayjs';
import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  MoreVertical,
  Edit2,
  Trash2,
  Check,
  X,
  Copy,
  CheckCheck,
  Reply,
} from 'lucide-react';
import { EmojiPicker } from './emoji-picker';
import { MessageReactions } from './message-reactions';
import { OportunidadeCardMessage } from './oportunidade-card-message';

// Componente para renderizar texto com menções
function TextWithMentions({
  text,
  currentUserId,
  isOwn,
  mensagem,
}: {
  text: string;
  currentUserId?: string;
  isOwn: boolean;
  mensagem?: any;
}) {
  const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  // Debug: verificar se menções estão chegando
  if (text.includes('@[')) {
  }

  while ((match = mentionRegex.exec(text)) !== null) {
    // Adicionar texto antes da menção
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    const [, username, userId] = match;
    const isCurrentUser = userId === currentUserId;

    // Tentar pegar a cor do cargo do usuário mencionado
    const userCargo = mensagem?.mencoes?.find(
      (m: any) => m.usuarioMencionadoId === userId,
    )?.usuarioMencionado?.cargo;
    const cargoColor = userCargo?.cor;

    // Adicionar menção com estilo personalizado baseado na cor do cargo
    parts.push(
      <span
        key={match.index}
        className={cn(
          'inline-flex items-center px-2 py-0.5 rounded-md font-medium transition-all duration-200 cursor-pointer',
          // Se é você sendo mencionado
          isCurrentUser
            ? isOwn
              ? 'bg-zinc-700/50 text-zinc-100 hover:bg-zinc-700 border-l-2 border-zinc-400'
              : 'bg-blue-500/15 text-blue-600 hover:bg-blue-500/25 hover:shadow-md border-l-2 border-blue-500'
            : // Se não é você, mas tem cor do cargo
              cargoColor
              ? ''
              : // Fallback se não tem cor
                isOwn
                ? 'bg-zinc-700/30 text-zinc-200 hover:bg-zinc-700/50'
                : 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300 border-l-2 border-zinc-400',
        )}
        style={
          cargoColor && !isCurrentUser
            ? isOwn
              ? {
                  backgroundColor: `${cargoColor}25`,
                  borderLeftColor: cargoColor,
                  borderLeftWidth: '2px',
                  color: cargoColor,
                }
              : {
                  backgroundColor: `${cargoColor}15`,
                  borderLeftColor: cargoColor,
                  borderLeftWidth: '2px',
                  color: cargoColor,
                }
            : undefined
        }
        onMouseEnter={(e) => {
          if (cargoColor && !isCurrentUser) {
            e.currentTarget.style.backgroundColor = isOwn
              ? `${cargoColor}35`
              : `${cargoColor}25`;
            e.currentTarget.style.boxShadow = `0 0 8px ${cargoColor}40`;
          }
        }}
        onMouseLeave={(e) => {
          if (cargoColor && !isCurrentUser) {
            e.currentTarget.style.backgroundColor = isOwn
              ? `${cargoColor}25`
              : `${cargoColor}15`;
            e.currentTarget.style.boxShadow = 'none';
          }
        }}
        data-user-id={userId}
      >
        @{username}
      </span>,
    );

    lastIndex = match.index + match[0].length;
  }

  // Adicionar texto restante
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return <>{parts.length > 0 ? parts : text}</>;
}

// Componente para bloco de código com botão de copiar
function CodeBlock({
  children,
  className,
  isOwn,
}: {
  children: React.ReactNode;
  className?: string;
  isOwn?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const language = className?.replace('language-', '') || '';

  const handleCopy = async () => {
    const text = String(children).replace(/\n$/, '');
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group/code my-2 rounded-lg overflow-hidden border border-border/50 bg-zinc-950 dark:bg-zinc-900">
      <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-800/50 border-b border-border/30">
        <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">
          {language || 'código'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          {copied ? (
            <>
              <CheckCheck className="h-3 w-3" />
              <span>Copiado!</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>Copiar</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3 overflow-x-auto text-sm leading-relaxed">
        <code className={cn('text-zinc-100 font-mono text-[13px]', className)}>
          {children}
        </code>
      </pre>
    </div>
  );
}

// Componente para código inline
function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="px-1.5 py-0.5 rounded bg-black/20 font-mono text-[13px]">
      {children}
    </code>
  );
}

export type Reacao = {
  id: string;
  emoji: string;
  usuarioId: string;
  usuario: {
    id: string;
    nome: string;
  };
};

export type Mensagem = {
  id: string;
  conteudo: string;
  tipo?: 'texto' | 'sistema' | 'arquivo' | 'oportunidade';
  metadata?: any;
  createdAt: string;
  editado?: boolean;
  editadoEm?: string;
  reacoes?: Reacao[];
  mencoes?: Array<{
    usuarioMencionadoId: string;
    usuarioMencionado?: {
      id: string;
      nome: string;
      cargo?: {
        nomeCargo: string;
        cor?: string | null;
      } | null;
    };
  }>;
  usuario?: {
    id: string;
    nome: string;
    avatarUrl?: string;
    cargo?: {
      nomeCargo: string;
      cor?: string | null;
    } | null;
  };
  respostaPara?: {
    id: string;
    conteudo: string;
    usuarioId: string;
    usuario?: { id: string; nome: string };
  } | null;
};

export type MessageItemProps = {
  mensagem: Mensagem;
  showAvatar: boolean;
  isOwn: boolean;
  currentUserId?: string;
  onViewProfile: (usuarioId: string) => void;
  onAddReaction: (mensagemId: string, emoji: string) => void;
  onRemoveReaction: (mensagemId: string, emoji: string) => void;
  onEdit: (mensagemId: string, novoConteudo: string) => void;
  onDelete: (mensagemId: string) => void;
  onReply: (mensagem: Mensagem) => void;
  isHighlighted?: boolean;
};

function MessageItemComponent({
  mensagem,
  showAvatar,
  isOwn,
  currentUserId,
  onViewProfile,
  onAddReaction,
  onRemoveReaction,
  onEdit,
  onDelete,
  onReply,
  isHighlighted = false,
}: MessageItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(mensagem.conteudo ?? '');

  const getInitials = useCallback((name: string | undefined) => {
    if (!name || name.trim().length === 0) {
      return 'U';
    }
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }, []);

  const canEditOrDelete = useCallback(() => {
    const mensagemData = dayjs(mensagem.createdAt);
    const agora = dayjs();
    const diffMinutos = agora.diff(mensagemData, 'minute');
    return diffMinutos <= 30;
  }, [mensagem.createdAt]);

  const handleSaveEdit = useCallback(() => {
    if (editContent.trim() && editContent !== mensagem.conteudo) {
      onEdit(mensagem.id, editContent);
    }
    setIsEditing(false);
  }, [editContent, mensagem.conteudo, mensagem.id, onEdit]);

  const handleCancelEdit = useCallback(() => {
    setEditContent(mensagem.conteudo ?? '');
    setIsEditing(false);
  }, [mensagem.conteudo]);

  const handleReactionClick = useCallback(
    (emoji: string, hasUserReacted: boolean) => {
      if (hasUserReacted) {
        onRemoveReaction(mensagem.id, emoji);
      } else {
        onAddReaction(mensagem.id, emoji);
      }
    },
    [mensagem.id, onAddReaction, onRemoveReaction],
  );

  const handleAddReaction = useCallback(
    (emoji: string) => {
      onAddReaction(mensagem.id, emoji);
    },
    [mensagem.id, onAddReaction],
  );

  const handleViewProfile = useCallback(() => {
    if (mensagem.usuario?.id) {
      onViewProfile(mensagem.usuario.id);
    }
  }, [mensagem.usuario?.id, onViewProfile]);

  const handleDelete = useCallback(() => {
    if (confirm('Tem certeza que deseja excluir esta mensagem?')) {
      onDelete(mensagem.id);
    }
  }, [mensagem.id, onDelete]);

  const handleReply = useCallback(() => {
    onReply(mensagem);
  }, [mensagem, onReply]);

  const handleStartEditing = useCallback(() => {
    setIsEditing(true);
  }, []);

  // Processar menções antes do markdown
  const processedContent = useMemo(() => {
    // Se tem menções no formato @[Nome](userId), não processar como markdown
    if (mensagem.conteudo?.includes('@[')) {
      return mensagem.conteudo;
    }
    return mensagem.conteudo ?? '';
  }, [mensagem.conteudo]);

  // Componentes customizados para markdown
  const markdownComponents: Components = useMemo(
    () => ({
      pre: ({ children }) => <>{children}</>,
      code: ({ className, children }) => {
        const isBlock =
          className?.includes('language-') || String(children).includes('\n');

        if (isBlock) {
          return (
            <CodeBlock className={className} isOwn={isOwn}>
              {children}
            </CodeBlock>
          );
        }

        return <InlineCode>{children}</InlineCode>;
      },
      p: ({ children }) => {
        // Se o conteúdo é uma string, processar menções
        if (typeof children === 'string') {
          return (
            <p>
              <TextWithMentions
                text={children}
                currentUserId={currentUserId}
                isOwn={isOwn}
                mensagem={mensagem}
              />
            </p>
          );
        }
        return <p>{children}</p>;
      },
    }),
    [isOwn, currentUserId, mensagem],
  );

  return (
    <div
      className={cn(
        'flex w-full mb-1 transition-colors duration-300 animate-in fade-in-0 slide-in-from-bottom-1 duration-200',
        isOwn ? 'justify-end' : 'justify-start',
        showAvatar && 'mt-6',
        isHighlighted && 'bg-primary/10 -mx-2 px-2 py-2 rounded-lg',
      )}
    >
      <div
        className={cn(
          'flex gap-2 max-w-[85%] md:max-w-[70%] min-w-0',
          isOwn ? 'flex-row-reverse' : 'flex-row',
        )}
      >
        {/* Avatar */}
        {showAvatar ? (
          <Avatar
            className="h-8 w-8 cursor-pointer ring-2 ring-transparent hover:ring-primary/30 transition-all flex-shrink-0 mt-1"
            onClick={handleViewProfile}
            style={
              !isOwn && mensagem.usuario?.cargo?.cor
                ? {
                    borderColor: mensagem.usuario.cargo.cor,
                    borderWidth: '2px',
                  }
                : undefined
            }
          >
            {mensagem.usuario?.avatarUrl && (
              <AvatarImage
                src={mensagem.usuario.avatarUrl}
                alt={mensagem.usuario?.nome || 'Usuário'}
              />
            )}
            <AvatarFallback
              className={cn(
                'text-xs',
                isOwn ? 'bg-primary/80 text-primary-foreground' : 'bg-muted',
              )}
              style={
                !isOwn && mensagem.usuario?.cargo?.cor
                  ? {
                      backgroundColor: `${mensagem.usuario.cargo.cor}20`,
                      color: mensagem.usuario.cargo.cor,
                    }
                  : undefined
              }
            >
              {getInitials(mensagem.usuario?.nome)}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="w-8 flex-shrink-0" />
        )}

        {/* Balão da mensagem */}
        <div
          className={cn(
            'flex flex-col min-w-0 flex-1',
            isOwn ? 'items-end' : 'items-start',
          )}
        >
          {/* Nome do usuário */}
          {showAvatar && !isOwn && (
            <button
              className="text-xs font-semibold hover:opacity-80 transition-colors mb-2 px-3 text-foreground"
              onClick={handleViewProfile}
            >
              {mensagem.usuario?.nome || 'Usuário Desconhecido'}
              {mensagem.usuario?.cargo?.nomeCargo && (
                <span className="ml-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                  {mensagem.usuario.cargo.nomeCargo}
                </span>
              )}
            </button>
          )}

          {/* Conteúdo do balão */}
          <div className="group relative max-w-full">
            {/* Renderizar card de oportunidade se for tipo oportunidade */}
            {mensagem.tipo === 'oportunidade' && mensagem.metadata ? (
              <OportunidadeCardMessage
                metadata={mensagem.metadata}
                isOwn={isOwn}
              />
            ) : isEditing ? (
              <div className="space-y-2 p-3 bg-muted rounded-2xl min-w-[200px] max-w-full">
                <Input
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSaveEdit();
                    } else if (e.key === 'Escape') {
                      handleCancelEdit();
                    }
                  }}
                  className="text-sm"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleSaveEdit}
                    className="h-7 px-2"
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Salvar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCancelEdit}
                    className="h-7 px-2"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <div
                className={cn(
                  'relative px-3 py-2 rounded-2xl shadow-sm max-w-full break-words',
                  isOwn
                    ? 'bg-primary text-primary-foreground rounded-tr-sm'
                    : 'bg-muted text-foreground rounded-tl-sm',
                )}
              >
                {/* Preview de resposta */}
                {mensagem.respostaPara && (
                  <div
                    className={cn(
                      'mb-2 px-2 py-1.5 rounded-lg border-l-2 text-xs',
                      isOwn
                        ? 'bg-primary-foreground/10 border-primary-foreground/40'
                        : 'bg-background/50 border-primary/40',
                    )}
                  >
                    <p className={cn('font-semibold mb-0.5', isOwn ? 'text-primary-foreground/80' : 'text-primary')}>
                      {mensagem.respostaPara.usuario?.nome || 'Usuário'}
                    </p>
                    <p className={cn('truncate', isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                      {mensagem.respostaPara.conteudo?.replace(/@\[([^\]]+)\]\([^)]+\)/g, '@$1').slice(0, 80)}
                      {(mensagem.respostaPara.conteudo?.length || 0) > 80 ? '...' : ''}
                    </p>
                  </div>
                )}

                {/* Conteúdo da mensagem */}
                <div className="text-sm break-words">
                  {mensagem.conteudo?.includes('@[') ? (
                    <TextWithMentions
                      text={mensagem.conteudo}
                      currentUserId={currentUserId}
                      isOwn={isOwn}
                      mensagem={mensagem}
                    />
                  ) : (
                    <div
                      className={cn(
                        'prose prose-sm max-w-none leading-snug text-sm break-words overflow-hidden',
                        isOwn
                          ? 'prose-invert prose-p:text-primary-foreground/95 prose-strong:text-primary-foreground prose-em:text-primary-foreground/90 prose-a:text-primary-foreground prose-a:underline'
                          : 'dark:prose-invert prose-p:text-foreground prose-strong:text-foreground prose-em:text-foreground prose-a:text-primary',
                        'prose-p:my-0 prose-p:leading-snug prose-p:break-words',
                        'prose-ul:my-1 prose-ol:my-1 prose-li:my-0',
                        'prose-pre:my-0 prose-pre:bg-transparent prose-pre:p-0 prose-pre:max-w-full prose-pre:overflow-x-auto',
                        'prose-blockquote:border-l-2 prose-blockquote:pl-2 prose-blockquote:my-1',
                        'prose-h1:text-base prose-h1:font-bold prose-h1:my-1',
                        'prose-h2:text-sm prose-h2:font-bold prose-h2:my-1',
                        'prose-h3:text-sm prose-h3:font-semibold prose-h3:my-1',
                      )}
                    >
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={markdownComponents}
                      >
                        {mensagem.conteudo ?? ''}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>

                {/* Horário e status de editado */}
                <div
                  className={cn(
                    'flex items-center gap-1 mt-1 text-[10px]',
                    isOwn
                      ? 'text-primary-foreground/70 justify-end'
                      : 'text-muted-foreground',
                  )}
                >
                  {mensagem.editado && (
                    <span
                      className="italic"
                      title={
                        mensagem.editadoEm
                          ? dayjs(mensagem.editadoEm).format(
                              'DD/MM/YYYY [às] HH:mm',
                            )
                          : undefined
                      }
                    >
                      editado
                    </span>
                  )}
                  <span>{dayjs(mensagem.createdAt).format('HH:mm')}</span>
                </div>

                {/* Menu de ações (hover) */}
                <div
                  className={cn(
                    'absolute top-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 bg-background rounded-lg shadow-lg border px-1 py-0.5',
                    isOwn
                      ? 'left-0 -translate-x-full -ml-2'
                      : 'right-0 translate-x-full mr-2',
                  )}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted"
                    onClick={handleReply}
                    title="Responder"
                  >
                    <Reply className="h-4 w-4" />
                  </Button>
                  <EmojiPicker
                    onEmojiSelect={handleAddReaction}
                    side={isOwn ? 'left' : 'right'}
                  />

                  {isOwn && canEditOrDelete() && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align={isOwn ? 'end' : 'start'}>
                        <DropdownMenuItem onClick={handleStartEditing}>
                          <Edit2 className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={handleDelete}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            )}

            {/* Reações */}
            {(mensagem.reacoes?.length ?? 0) > 0 && (
              <div className={cn('mt-1', isOwn ? 'flex justify-end' : '')}>
                <MessageReactions
                  reacoes={mensagem.reacoes || []}
                  onReactionClick={handleReactionClick}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Memoizar o componente para evitar re-renders desnecessários
export const MessageItem = memo(
  MessageItemComponent,
  (prevProps, nextProps) => {
    return (
      prevProps.mensagem.id === nextProps.mensagem.id &&
      prevProps.mensagem.conteudo === nextProps.mensagem.conteudo &&
      prevProps.mensagem.editado === nextProps.mensagem.editado &&
      prevProps.mensagem.reacoes?.length === nextProps.mensagem.reacoes?.length &&
      prevProps.mensagem.respostaPara?.id === nextProps.mensagem.respostaPara?.id &&
      prevProps.showAvatar === nextProps.showAvatar &&
      prevProps.isOwn === nextProps.isOwn &&
      prevProps.isHighlighted === nextProps.isHighlighted
    );
  },
);
