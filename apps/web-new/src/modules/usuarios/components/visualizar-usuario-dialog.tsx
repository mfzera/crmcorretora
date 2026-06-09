
import { useState } from 'react';
import {
  User,
  Mail,
  Phone,
  Briefcase,
  Users as UsersIcon,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/core/ui/dialog';
import { Badge } from '@/core/ui/badge';
import { Separator } from '@/core/ui/separator';
import type { Usuario } from '@/types/usuario';

interface VisualizarUsuarioDialogProps {
  usuario: Usuario;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function VisualizarUsuarioDialog({
  usuario,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: VisualizarUsuarioDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? controlledOnOpenChange! : setInternalOpen;

  const formatDate = (date: string | null) => {
    if (!date) return 'Nunca';
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Detalhes do Usuário
          </DialogTitle>
          <DialogDescription>
            Informações completas de {usuario.nome}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">
              Status:
            </span>
            {usuario.ativo ? (
              <Badge variant="default" className="gap-1">
                <CheckCircle className="h-3 w-3" />
                Ativo
              </Badge>
            ) : (
              <Badge variant="destructive" className="gap-1">
                <XCircle className="h-3 w-3" />
                Inativo
              </Badge>
            )}
            {usuario.primeiroAcesso && (
              <Badge variant="secondary" className="gap-1">
                <Clock className="h-3 w-3" />
                Primeiro Acesso Pendente
              </Badge>
            )}
          </div>

          <Separator />

          {/* Informações Pessoais */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Informações Pessoais</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Nome Completo</p>
                  <p className="text-sm text-muted-foreground">
                    {usuario.nome}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">
                    {usuario.email}
                  </p>
                </div>
              </div>

              {usuario.telefone && (
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Telefone</p>
                    <p className="text-sm text-muted-foreground">
                      {usuario.telefone}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Informações Organizacionais */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">
              Informações Organizacionais
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {usuario.cargo && (
                <div className="flex items-start gap-3">
                  <Briefcase className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Cargo</p>
                    <p className="text-sm text-muted-foreground">
                      {usuario.cargo.nome}
                    </p>
                  </div>
                </div>
              )}

              {usuario.equipe && (
                <div className="flex items-start gap-3">
                  <UsersIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Equipe</p>
                    <p className="text-sm text-muted-foreground">
                      {usuario.equipe.nome}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Informações de Acesso */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Informações de Acesso</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Último Login</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(usuario.ultimoLogin)}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Criado em</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(usuario.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
