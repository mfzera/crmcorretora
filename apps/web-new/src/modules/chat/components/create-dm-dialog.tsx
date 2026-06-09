
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/core/ui/dialog';
import { Button } from '@/core/ui/button';
import { Input } from '@/core/ui/input';
import { Label } from '@/core/ui/label';
import { toast } from 'sonner';
import { handleApiError } from '@/core/utils/handle-api-error';
import { api } from '@/infra/http/api';
import { useUsuarios } from '@/modules/usuarios/http';
import { usePermissions } from '@/core/hooks/use-permissions';
import { ScrollArea } from '@/core/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/core/ui/avatar';
import { useAuthStore } from '@/infra/auth/auth-store';

type CreateDMDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCanalCreated?: (canalId: string) => void;
};

export function CreateDMDialog({
  open,
  onOpenChange,
  onCanalCreated,
}: CreateDMDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { hasPermission } = usePermissions();
  const canViewUsuarios = hasPermission('usuarios:visualizar');

  const { data: usuariosData } = useUsuarios(undefined, {
    enabled: canViewUsuarios,
  });
  const usuarios = usuariosData?.data || [];

  const filteredUsuarios = usuarios.filter(
    (u: any) =>
      u.id !== user?.id &&
      (u.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  const handleSelectUsuario = async (usuarioId: string) => {
    setIsSubmitting(true);

    try {
      const response = await api.post<{
        canal: { id: string };
        created: boolean;
      }>('/chat/direto', {
        usuarioDestinoId: usuarioId,
      });

      const canalId = response.canal?.id;

      if (!canalId) {
        toast.error('Erro: Canal não foi criado corretamente');
        return;
      }

      // Fechar dialog primeiro para melhor UX
      onOpenChange(false);
      setSearchTerm('');

      // Atualizar lista de canais e aguardar refetch completar
      await queryClient.refetchQueries({ queryKey: ['canais'] });

      // Selecionar o canal criado/existente
      onCanalCreated?.(canalId);

      // Toast depois para não bloquear a UI
      toast.success(
        response.created ? 'Conversa iniciada' : 'Abrindo conversa',
      );
    } catch (error) {
      toast.error(handleApiError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nova Mensagem Direta</DialogTitle>
          <DialogDescription>
            Selecione um usuário para iniciar uma conversa
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="search">Buscar usuário</Label>
            <Input
              id="search"
              placeholder="Digite o nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <ScrollArea className="h-64 rounded-md border">
            <div className="p-2 space-y-1">
              {filteredUsuarios.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  {searchTerm
                    ? 'Nenhum usuário encontrado'
                    : 'Digite para buscar usuários'}
                </div>
              ) : (
                filteredUsuarios.map((usuario: any) => (
                  <button
                    key={usuario.id}
                    onClick={() => handleSelectUsuario(usuario.id)}
                    disabled={isSubmitting}
                    className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-accent transition-colors disabled:opacity-50"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {getInitials(usuario.nome)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-sm">{usuario.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {usuario.email}
                      </p>
                      {usuario.cargo && (
                        <p className="text-xs text-muted-foreground">
                          {usuario.cargo.nomeCargo}
                        </p>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setSearchTerm('');
            }}
          >
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
