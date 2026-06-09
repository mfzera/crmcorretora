
import { useState } from 'react';
import { UserPlus, Trash2, Loader2, Crown, Users } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/core/ui/dialog';
import { Button } from '@/core/ui/button';
import { Badge } from '@/core/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/core/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/core/ui/select';
import { Separator } from '@/core/ui/separator';
import { useEquipe, useAdicionarMembro, useRemoverMembro } from '@/modules/equipes/http';
import { useUsuarios } from '@/modules/usuarios/http';
import { useAuthStore } from '@/infra/auth/auth-store';
import type { Equipe } from '@/types/equipe';

function getInitials(nome: string) {
  return nome
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

interface EquipeDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipe: Equipe | null;
  onEdit?: () => void;
}

export function EquipeDetailDialog({
  open,
  onOpenChange,
  equipe,
  onEdit,
}: EquipeDetailDialogProps) {
  const [usuarioParaAdicionar, setUsuarioParaAdicionar] = useState<string>('');
  const { user } = useAuthStore();

  const { data: detalhe, isLoading } = useEquipe(open && equipe ? equipe.id : null);
  const { data: usuariosData } = useUsuarios({ limit: 100 });
  const adicionarMembro = useAdicionarMembro();
  const removerMembro = useRemoverMembro();

  const canManage =
    user?.isAdmin || (equipe?.gestorId === user?.id);
  const isAdmin = user?.isAdmin;

  const membrosIds = new Set(detalhe?.membros?.map((m) => m.id) ?? []);
  const usuariosDisponiveis = (usuariosData?.data ?? []).filter(
    (u) => !membrosIds.has(u.id),
  );

  const handleAdicionarMembro = async () => {
    if (!equipe || !usuarioParaAdicionar) return;
    await adicionarMembro.mutateAsync({
      equipeId: equipe.id,
      usuarioId: usuarioParaAdicionar,
    });
    setUsuarioParaAdicionar('');
  };

  const handleRemoverMembro = async (usuarioId: string) => {
    if (!equipe) return;
    await removerMembro.mutateAsync({ equipeId: equipe.id, usuarioId });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-start justify-between gap-2">
            <div>
              <DialogTitle className="text-xl">{equipe?.nome}</DialogTitle>
              <div className="mt-1 flex items-center gap-2">
                <Badge variant={equipe?.ativo ? 'default' : 'secondary'}>
                  {equipe?.ativo ? 'Ativa' : 'Inativa'}
                </Badge>
                {detalhe && (
                  <span className="text-sm text-muted-foreground">
                    {detalhe.membros.length} membro{detalhe.membros.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
            {isAdmin && onEdit && (
              <Button variant="outline" size="sm" onClick={onEdit}>
                Editar
              </Button>
            )}
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Lider */}
            {detalhe?.gestor && (
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Lider
                </p>
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={detalhe.gestor.avatarUrl ?? undefined} />
                    <AvatarFallback>{getInitials(detalhe.gestor.nome)}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{detalhe.gestor.nome}</span>
                  <Crown className="h-4 w-4 text-yellow-500 ml-auto" />
                </div>
              </div>
            )}

            <Separator />

            {/* Membros */}
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Membros</span>
              </div>

              {detalhe?.membros.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">Nenhum membro na equipe.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {detalhe?.membros.map((membro) => (
                    <div
                      key={membro.id}
                      className="flex items-center gap-3 rounded-lg border p-2"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={membro.avatarUrl ?? undefined} />
                        <AvatarFallback>{getInitials(membro.nome)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{membro.nome}</p>
                        {membro.cargo && (
                          <div className="flex items-center gap-1.5">
                            {membro.cargo.cor && (
                              <span
                                className="inline-block h-2 w-2 rounded-full"
                                style={{ backgroundColor: membro.cargo.cor }}
                              />
                            )}
                            <p className="text-xs text-muted-foreground truncate">
                              {membro.cargo.nomeCargo}
                            </p>
                          </div>
                        )}
                      </div>
                      {canManage && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoverMembro(membro.id)}
                          disabled={removerMembro.isPending}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Adicionar membro */}
            {canManage && (
              <>
                <Separator />
                <div className="flex gap-2">
                  <Select value={usuarioParaAdicionar} onValueChange={setUsuarioParaAdicionar}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Adicionar membro..." />
                    </SelectTrigger>
                    <SelectContent>
                      {usuariosDisponiveis.length === 0 ? (
                        <SelectItem value="__none__" disabled>
                          Todos os usuários já são membros
                        </SelectItem>
                      ) : (
                        usuariosDisponiveis.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.nome}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <Button
                    size="icon"
                    onClick={handleAdicionarMembro}
                    disabled={!usuarioParaAdicionar || adicionarMembro.isPending}
                  >
                    {adicionarMembro.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UserPlus className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
