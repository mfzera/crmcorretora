
import { useState, useMemo, useRef, useEffect } from 'react';
import { Plus, Hash, PanelLeftClose, Search } from 'lucide-react';
import { Button } from '@/core/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/core/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/core/ui/tabs';
import { CreateChannelDialog } from './create-channel-dialog';
import { CreateDMDialog } from './create-dm-dialog';
import { Skeleton } from '@/core/ui/skeleton';
import { cn } from '@/core/utils';
import { type Canal } from '../http';
import { useAuthStore } from '@/infra/auth/auth-store';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/pt-br';

dayjs.extend(relativeTime);
dayjs.locale('pt-br');

const stripMentions = (content: string): string => {
  if (!content) return '';
  return content.replace(/@\[([^\]]+)\]\([^)]+\)/g, '@$1');
};

const getMessagePreview = (canal: Canal, currentUserId: string | undefined): string => {
  const msg = canal.ultimaMensagem;
  if (!msg) return '';

  const content = stripMentions(msg.conteudo);
  const isOwn = msg.usuarioId === currentUserId;

  if (isOwn) return `Você: ${content}`;

  const senderName = msg.usuario?.nome?.split(' ')[0];
  if (senderName) return `${senderName}: ${content}`;

  return content;
};

type ChannelListProps = {
  canais: Canal[];
  selectedCanalId: string | null;
  onSelectCanal: (id: string) => void;
  isConnected: boolean;
  isLoading?: boolean;
  onCanalCreated?: (id: string) => void;
  onToggleVisibility?: () => void;
  onlineUsers?: Set<string>;
};

export function ChannelList({
  canais,
  selectedCanalId,
  onSelectCanal,
  isConnected,
  isLoading = false,
  onCanalCreated,
  onToggleVisibility,
  onlineUsers = new Set(),
}: ChannelListProps) {
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showCreateDM, setShowCreateDM] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuthStore();

  // Adicionar atalho Ctrl+K para focar na busca
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const canaisGerais = useMemo(
    () =>
      canais.filter(
        (c) =>
          c.tipo === 'geral' &&
          (!searchQuery ||
            c.nome?.toLowerCase().includes(searchQuery.toLowerCase())),
      ),
    [canais, searchQuery],
  );

  const canaisDiretos = useMemo(() => {
    const diretos = canais.filter(
      (c) =>
        c.tipo === 'direto' &&
        (!searchQuery ||
          c.outroUsuario?.nome
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase())),
    );

    return diretos;
  }, [canais, searchQuery]);

  const getInitials = (name: string | undefined | null) => {
    if (!name || name.trim().length === 0) {
      return 'U';
    }
    const parts = name
      .trim()
      .split(' ')
      .filter((p) => p.length > 0);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="flex flex-col h-full bg-card border-r">
      {/* Header - Search only */}
      <div className="p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Buscar conversas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-muted/50 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-muted"
          />
        </div>
      </div>

      <Tabs
        defaultValue="todos"
        className="flex-1 flex flex-col overflow-hidden"
      >
        <TabsList className="w-full bg-transparent p-2 gap-1 h-auto mx-2">
          <TabsTrigger
            value="todos"
            className="flex-1 rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
          >
            Todos
          </TabsTrigger>
          <TabsTrigger
            value="diretas"
            className="flex-1 rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
          >
            Diretas
          </TabsTrigger>
          <TabsTrigger
            value="canais"
            className="flex-1 rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
          >
            Canais
          </TabsTrigger>
        </TabsList>

        {/* Todos Tab */}
        <TabsContent
          value="todos"
          className="flex-1 m-0 overflow-hidden flex flex-col"
        >
          <div className="flex-1 overflow-y-auto scrollbar-thin" data-lenis-prevent>
            <div className="p-3 space-y-1">
              {isLoading ? (
                <>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="px-3 py-2.5">
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ))}
                </>
              ) : canais.length === 0 ? (
                <p className="text-xs text-muted-foreground px-3 py-4 text-center">
                  Nenhuma conversa disponível
                </p>
              ) : (
                canais
                  .sort((a, b) => {
                    // Ordenar por mensagem mais recente
                    const dateA = a.ultimaMensagem?.createdAt
                      ? new Date(a.ultimaMensagem.createdAt).getTime()
                      : 0;
                    const dateB = b.ultimaMensagem?.createdAt
                      ? new Date(b.ultimaMensagem.createdAt).getTime()
                      : 0;
                    return dateB - dateA;
                  })
                  .map((canal) => (
                    <button
                      key={canal.id}
                      onClick={() => onSelectCanal(canal.id)}
                      className={cn(
                        'w-full text-left px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-all group border-l-[3px] border-transparent',
                        selectedCanalId === canal.id && 'bg-primary/10 border-primary',
                      )}
                    >
                      <div className="flex items-center gap-3">
                        {canal.tipo === 'direto' ? (
                          <div className="relative flex-shrink-0">
                            <Avatar className="h-10 w-10">
                              {canal.outroUsuario?.avatarUrl && (
                                <AvatarImage
                                  src={canal.outroUsuario.avatarUrl}
                                  alt={canal.outroUsuario?.nome || 'Usuário'}
                                />
                              )}
                              <AvatarFallback className="text-sm">
                                {getInitials(canal.outroUsuario?.nome)}
                              </AvatarFallback>
                            </Avatar>
                            {canal.outroUsuario?.id && (
                              <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full ring-2 ring-background ${onlineUsers.has(canal.outroUsuario.id) ? 'bg-green-500' : 'bg-zinc-400'}`} />
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10 text-primary">
                            <Hash className="h-5 w-5" />
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <span className="font-medium text-sm truncate">
                              {canal.tipo === 'direto'
                                ? canal.outroUsuario?.nome ||
                                  'Usuário Desconhecido'
                                : canal.nome}
                            </span>
                            {canal.ultimaMensagem && (
                              <span className="text-[10px] text-muted-foreground flex-shrink-0">
                                {dayjs(
                                  canal.ultimaMensagem.createdAt,
                                ).fromNow()}
                              </span>
                            )}
                          </div>
                          {canal.ultimaMensagem && (
                            <p className="text-xs text-muted-foreground truncate overflow-hidden whitespace-nowrap">
                              {getMessagePreview(canal, user?.id)}
                            </p>
                          )}
                        </div>

                        {canal.naoLidas > 0 && (
                          <div className="flex-shrink-0 flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold">
                            {canal.naoLidas}
                          </div>
                        )}
                      </div>
                    </button>
                  ))
              )}
            </div>
          </div>
        </TabsContent>

        {/* Mensagens Diretas Tab */}
        <TabsContent
          value="diretas"
          className="flex-1 m-0 overflow-hidden flex flex-col"
        >
          <div className="flex items-center justify-end px-4 py-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowCreateDM(true)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin" data-lenis-prevent>
            <div className="p-3 space-y-1">
              {isLoading ? (
                <>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="px-3 py-2.5">
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ))}
                </>
              ) : canaisDiretos.length === 0 ? (
                <p className="text-xs text-muted-foreground px-3 py-4 text-center">
                  Nenhuma conversa iniciada
                </p>
              ) : (
                canaisDiretos.map((canal) => (
                  <button
                    key={canal.id}
                    onClick={() => onSelectCanal(canal.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all border-l-[3px]',
                      selectedCanalId === canal.id
                        ? 'bg-primary/10 border-primary'
                        : 'hover:bg-muted/50 border-transparent',
                    )}
                  >
                    <div className="relative flex-shrink-0">
                      <Avatar
                        className={cn(
                          'h-8 w-8 ring-2 transition-all',
                          selectedCanalId === canal.id
                            ? 'ring-primary/30'
                            : 'ring-transparent',
                        )}
                      >
                        {canal.outroUsuario?.avatarUrl && (
                          <AvatarImage
                            src={canal.outroUsuario.avatarUrl}
                            alt={canal.outroUsuario.nome}
                          />
                        )}
                        <AvatarFallback
                          className={cn(
                            selectedCanalId === canal.id
                              ? 'bg-primary/20 text-primary'
                              : 'bg-muted',
                          )}
                        >
                          {getInitials(canal.outroUsuario?.nome)}
                        </AvatarFallback>
                      </Avatar>
                      {canal.outroUsuario?.id && (
                        <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-background ${onlineUsers.has(canal.outroUsuario.id) ? 'bg-green-500' : 'bg-zinc-400'}`} />
                      )}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <span
                            className={cn(
                              'text-sm font-medium truncate block',
                              selectedCanalId === canal.id && 'text-primary',
                            )}
                          >
                            {canal.outroUsuario?.nome || 'Usuário Desconhecido'}
                          </span>
                          {canal.ultimaMensagem && (
                            <p className="text-xs text-muted-foreground truncate overflow-hidden whitespace-nowrap mt-0.5">
                              {getMessagePreview(canal, user?.id)}
                            </p>
                          )}
                        </div>
                        {canal.naoLidas > 0 && (
                          <div className="flex-shrink-0">
                            <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 text-xs font-semibold text-white bg-primary rounded-full">
                              {canal.naoLidas > 99 ? '99+' : canal.naoLidas}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </TabsContent>

        {/* Canais Tab */}
        <TabsContent
          value="canais"
          className="flex-1 m-0 overflow-hidden flex flex-col"
        >
          <div className="flex items-center justify-end px-4 py-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowCreateChannel(true)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin" data-lenis-prevent>
            <div className="p-3 space-y-1">
              {isLoading ? (
                <>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="px-3 py-2.5">
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ))}
                </>
              ) : canaisGerais.length === 0 ? (
                <p className="text-xs text-muted-foreground px-3 py-4 text-center">
                  Nenhum canal disponível
                </p>
              ) : (
                canaisGerais.map((canal) => (
                  <button
                    key={canal.id}
                    onClick={() => onSelectCanal(canal.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all border-l-[3px]',
                      selectedCanalId === canal.id
                        ? 'bg-primary/10 border-primary'
                        : 'hover:bg-muted/50 border-transparent',
                    )}
                  >
                    <div
                      className={cn(
                        'flex items-center justify-center h-8 w-8 rounded-md flex-shrink-0 transition-colors',
                        selectedCanalId === canal.id
                          ? 'bg-primary/20 text-primary'
                          : 'bg-muted text-muted-foreground',
                      )}
                    >
                      <Hash className="h-4 w-4" />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <span
                            className={cn(
                              'text-sm font-medium truncate block',
                              selectedCanalId === canal.id && 'text-primary',
                            )}
                          >
                            {canal.nome}
                          </span>
                          {canal.ultimaMensagem && (
                            <p className="text-xs text-muted-foreground truncate overflow-hidden whitespace-nowrap mt-0.5">
                              {getMessagePreview(canal, user?.id)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    {canal.naoLidas > 0 && (
                      <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground shadow-sm flex-shrink-0 leading-none">
                        {canal.naoLidas > 9 ? '9+' : canal.naoLidas}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <CreateChannelDialog
        open={showCreateChannel}
        onOpenChange={setShowCreateChannel}
      />
      <CreateDMDialog
        open={showCreateDM}
        onOpenChange={setShowCreateDM}
        onCanalCreated={onCanalCreated}
      />

      {/* Botão para esconder lista de canais */}
      {onToggleVisibility && (
        <div className="p-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleVisibility}
            className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
          >
            <PanelLeftClose className="h-4 w-4" />
            <span className="text-sm">Esconder canais</span>
          </Button>
        </div>
      )}
    </div>
  );
}

