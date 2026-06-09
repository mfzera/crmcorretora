
import {
  X,
  Hash,
  Users,
  UserPlus,
  Settings,
  Trash2,
  UserMinus,
} from 'lucide-react';
import { Button } from '@/core/ui/button';
import { Avatar, AvatarFallback } from '@/core/ui/avatar';
import { ScrollArea } from '@/core/ui/scroll-area';
import { Separator } from '@/core/ui/separator';
import { Badge } from '@/core/ui/badge';
import { useState } from 'react';
import { AddMembersDialog } from './add-members-dialog';
import { ChannelSettingsDialog } from './channel-settings-dialog';
import {
  useSairDoCanal,
  useRemoverMembroCanal,
  useMembrosCanal,
} from '../http';
import { useAuthStore } from '@/infra/auth/auth-store';
import { toast } from 'sonner';

type ChannelProfileProps = {
  canal: {
    id: string;
    nome?: string;
    descricao?: string | null;
    tipo: 'geral' | 'direto';
  };
  onClose: () => void;
  onViewMember?: (usuarioId: string) => void;
};

export function ChannelProfile({
  canal,
  onClose,
  onViewMember,
}: ChannelProfileProps) {
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const sairDoCanal = useSairDoCanal();
  const removerMembro = useRemoverMembroCanal(canal.id);
  const { user } = useAuthStore();

  // Buscar membros do canal
  const { data: membrosData, isLoading: isLoadingMembros } = useMembrosCanal(
    canal.id,
  );
  const membros = membrosData?.membros || [];

  const currentUserMember = membros.find((m) => m.id === user?.id);
  const isAdmin = currentUserMember?.isAdmin === true;

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const admins = membros.filter((m) => m.isAdmin === true) || [];
  const members = membros.filter((m) => !m.isAdmin) || [];

  return (
    <>
      <div className="flex flex-col h-full bg-card">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Informações do Canal</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
            {/* Canal Info */}
            <div className="flex flex-col items-center text-center">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Hash className="h-10 w-10 text-primary" />
              </div>
              <h2 className="text-xl font-semibold mb-1">{canal.nome}</h2>
              {canal.descricao && (
                <p className="text-sm text-muted-foreground">
                  {canal.descricao}
                </p>
              )}
            </div>

            <Separator />

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col items-center p-4 rounded-lg bg-muted/50">
                <Users className="h-5 w-5 text-muted-foreground mb-2" />
                <span className="text-2xl font-bold">
                  {isLoadingMembros ? '...' : membros.length}
                </span>
                <span className="text-xs text-muted-foreground">Membros</span>
              </div>
              <div className="flex flex-col items-center p-4 rounded-lg bg-muted/50">
                <Hash className="h-5 w-5 text-muted-foreground mb-2" />
                <span className="text-2xl font-bold capitalize">
                  {canal.tipo === 'geral' ? 'Canal' : 'Direto'}
                </span>
                <span className="text-xs text-muted-foreground">Tipo</span>
              </div>
            </div>

            <Separator />

            {/* Actions */}
            <div className="space-y-2">
              {isAdmin && (
                <>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setShowAddMembers(true)}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Adicionar Membros
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setShowSettings(true)}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Configurações do Canal
                  </Button>
                </>
              )}
            </div>

            <Separator />

            {/* Admins */}
            {admins.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">
                    Administradores ({admins.length})
                  </h4>
                </div>
                <div className="space-y-2">
                  {admins.map((membro) => (
                    <button
                      key={membro.id}
                      className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
                      onClick={() => onViewMember?.(membro.id)}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/10">
                          {getInitials(membro.nome)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">
                            {membro.nome}
                          </p>
                          <Badge
                            variant="secondary"
                            className="text-xs bg-primary/10"
                          >
                            Admin
                          </Badge>
                        </div>
                        {membro.cargo && (
                          <p className="text-xs text-muted-foreground truncate">
                            {membro.cargo.nomeCargo}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Members */}
            {members.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">
                    Membros ({members.length})
                  </h4>
                </div>
                <div className="space-y-2">
                  {members.map((membro) => (
                    <div
                      key={membro.id}
                      className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-muted/50 transition-colors group"
                    >
                      <button
                        className="flex items-center gap-3 flex-1 min-w-0 text-left"
                        onClick={() => onViewMember?.(membro.id)}
                      >
                        <Avatar
                          className="h-10 w-10"
                          style={
                            membro.cargo?.cor
                              ? {
                                  borderWidth: '2px',
                                  borderColor: membro.cargo.cor,
                                }
                              : undefined
                          }
                        >
                          <AvatarFallback className="bg-muted">
                            {getInitials(membro.nome)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {membro.nome}
                          </p>
                          {membro.cargo && (
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {membro.cargo.cor && (
                                <div
                                  className="w-2 h-2 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: membro.cargo.cor }}
                                />
                              )}
                              <p
                                className="text-xs truncate"
                                style={{
                                  color:
                                    membro.cargo.cor ||
                                    'hsl(var(--muted-foreground))',
                                }}
                              >
                                {membro.cargo.nomeCargo}
                              </p>
                            </div>
                          )}
                        </div>
                      </button>
                      {isAdmin && membro.id !== user?.id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={async () => {
                            if (
                              confirm(
                                `Tem certeza que deseja remover ${membro.nome} do canal?`,
                              )
                            ) {
                              try {
                                await removerMembro.mutateAsync(membro.id);
                              } catch (error) {
                                // Erro tratado no hook
                              }
                            }
                          }}
                        >
                          <UserMinus className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Danger Zone */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-destructive">
                Zona de Perigo
              </h4>
              <Button
                variant="destructive"
                className="w-full justify-start"
                disabled={sairDoCanal.isPending}
                onClick={async () => {
                  if (
                    confirm(
                      'Tem certeza que deseja sair deste canal? Você não receberá mais mensagens.',
                    )
                  ) {
                    try {
                      await sairDoCanal.mutateAsync(canal.id);
                      onClose();
                    } catch (error) {
                      // Erro tratado no hook
                    }
                  }
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {sairDoCanal.isPending ? 'Saindo...' : 'Sair do Canal'}
              </Button>
            </div>
          </div>
        </ScrollArea>
      </div>

      <AddMembersDialog
        open={showAddMembers}
        onOpenChange={setShowAddMembers}
        canalId={canal.id}
        currentMembers={membros.map((m) => m.id)}
      />

      <ChannelSettingsDialog
        open={showSettings}
        onOpenChange={setShowSettings}
        canal={canal}
      />
    </>
  );
}
