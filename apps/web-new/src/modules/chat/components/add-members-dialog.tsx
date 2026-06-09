
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/core/ui/dialog';
import { Button } from '@/core/ui/button';
import { Avatar, AvatarFallback } from '@/core/ui/avatar';
import { Checkbox } from '@/core/ui/checkbox';
import { ScrollArea } from '@/core/ui/scroll-area';
import { Input } from '@/core/ui/input';
import { Search, UserPlus } from 'lucide-react';
import { useUsuarios } from '@/modules/usuarios/http';
import { useAddMembrosCanal } from '../http';
import { usePermissions } from '@/core/hooks/use-permissions';
import { toast } from 'sonner';

type AddMembersDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canalId: string;
  currentMembers: string[];
};

export function AddMembersDialog({
  open,
  onOpenChange,
  canalId,
  currentMembers,
}: AddMembersDialogProps) {
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const { hasPermission } = usePermissions();
  const canViewUsuarios = hasPermission('usuarios:visualizar');

  const { data: usuariosData, isLoading } = useUsuarios(undefined, {
    enabled: canViewUsuarios,
  });
  const usuarios = usuariosData?.data || [];
  const addMembros = useAddMembrosCanal(canalId);

  // Filtra usuários que não são membros do canal
  const availableUsers = usuarios.filter(
    (u: any) => !currentMembers.includes(u.id),
  );

  // Filtra por termo de busca
  const filteredUsers = availableUsers.filter((u: any) =>
    u.nome?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const toggleUser = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const handleAdd = async () => {
    if (selectedUsers.length === 0) {
      toast.error('Selecione pelo menos um usuário');
      return;
    }

    try {
      await addMembros.mutateAsync(selectedUsers);
      toast.success(
        `${selectedUsers.length} ${selectedUsers.length === 1 ? 'membro adicionado' : 'membros adicionados'}`,
      );
      setSelectedUsers([]);
      onOpenChange(false);
    } catch (error) {
      // Error já tratado no hook
    }
  };

  const handleClose = () => {
    setSelectedUsers([]);
    setSearchTerm('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Adicionar Membros</DialogTitle>
          <DialogDescription>
            Selecione os usuários que deseja adicionar ao canal
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar usuários..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* User List */}
        <ScrollArea className="h-[300px] pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-muted-foreground">
                Carregando usuários...
              </p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <UserPlus className="h-12 w-12 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground text-center">
                {searchTerm
                  ? 'Nenhum usuário encontrado'
                  : 'Todos os usuários já são membros'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredUsers.map((usuario: any) => (
                <div
                  key={usuario.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => toggleUser(usuario.id)}
                >
                  <Checkbox
                    checked={selectedUsers.includes(usuario.id)}
                    onCheckedChange={() => toggleUser(usuario.id)}
                  />
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-muted">
                      {getInitials(usuario.nome)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {usuario.nome}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {usuario.email}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleAdd}
            disabled={selectedUsers.length === 0 || addMembros.isPending}
          >
            {addMembros.isPending
              ? 'Adicionando...'
              : `Adicionar (${selectedUsers.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
