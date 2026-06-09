
import { X, Mail, Phone, Briefcase, Users, ExternalLink } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Button } from '@/core/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/core/ui/avatar';
import { ScrollArea } from '@/core/ui/scroll-area';
import { useUsuarioPerfil } from '../http';
import { Skeleton } from '@/core/ui/skeleton';

type UserProfileProps = {
  usuarioId: string;
  onClose: () => void;
};

export function UserProfile({ usuarioId, onClose }: UserProfileProps) {
  const { data: perfilData, isLoading } = useUsuarioPerfil(usuarioId);
  const usuario = perfilData?.usuario;

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-card border-l">
        <div className="flex items-center justify-between p-4 border-b">
          <Skeleton className="h-6 w-24" />
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex flex-col items-center">
            <Skeleton className="h-24 w-24 rounded-full mb-4" />
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!usuario) {
    return (
      <div className="flex flex-col h-full bg-card border-l">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Perfil</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center justify-center h-full">
          <p className="text-sm text-muted-foreground">
            Usuário não encontrado
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-card relative z-10">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-background/50">
        <h3 className="font-semibold">Perfil</h3>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" asChild title="Ver perfil completo">
            <Link to="/equipe/$id" params={{ id: usuarioId }}>
              <ExternalLink className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="hover:bg-destructive/10 hover:text-destructive"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-6 py-6 space-y-6">
          {/* Avatar e Nome */}
          <div className="flex flex-col items-center text-center">
            <Avatar
              className="h-24 w-24 mb-4"
              style={
                usuario.cargo?.cor
                  ? {
                      borderWidth: '4px',
                      borderColor: usuario.cargo.cor,
                      boxShadow: `0 0 0 4px ${usuario.cargo.cor}20`,
                    }
                  : {
                      borderWidth: '4px',
                      borderColor: 'hsl(var(--primary))',
                      boxShadow: '0 0 0 4px hsl(var(--primary) / 0.2)',
                    }
              }
            >
              {usuario.avatarUrl && (
                <AvatarImage src={usuario.avatarUrl} alt={usuario.nome} />
              )}
              <AvatarFallback
                className="text-2xl"
                style={
                  usuario.cargo?.cor
                    ? {
                        backgroundColor: `${usuario.cargo.cor}20`,
                        color: usuario.cargo.cor,
                      }
                    : {
                        backgroundColor: 'hsl(var(--primary) / 0.1)',
                        color: 'hsl(var(--primary))',
                      }
                }
              >
                {getInitials(usuario.nome)}
              </AvatarFallback>
            </Avatar>
            <h2 className="text-xl font-bold mb-2">{usuario.nome}</h2>
            <div
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                usuario.ativo
                  ? 'bg-success/10 text-success'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {usuario.ativo ? 'Ativo' : 'Inativo'}
            </div>
          </div>

          {/* Informações */}
          <div className="space-y-3">
            <div className="rounded-lg border bg-background/50 p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex items-center justify-center h-8 w-8 rounded-md bg-primary/10 text-primary">
                  <Mail className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">
                  Email
                </span>
              </div>
              <p className="text-sm ml-11 break-all">{usuario.email}</p>
            </div>

            {usuario.telefone && (
              <div className="rounded-lg border bg-background/50 p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex items-center justify-center h-8 w-8 rounded-md bg-primary/10 text-primary">
                    <Phone className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">
                    Telefone
                  </span>
                </div>
                <p className="text-sm ml-11">{usuario.telefone}</p>
              </div>
            )}

            {usuario.cargo && (
              <div
                className="rounded-lg border p-4"
                style={{
                  backgroundColor: usuario.cargo.cor
                    ? `${usuario.cargo.cor}08`
                    : 'hsl(var(--background) / 0.5)',
                  borderColor: usuario.cargo.cor || 'hsl(var(--border))',
                  borderWidth: '2px',
                }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="flex items-center justify-center h-8 w-8 rounded-md"
                    style={{
                      backgroundColor: usuario.cargo.cor
                        ? `${usuario.cargo.cor}20`
                        : 'hsl(var(--primary) / 0.1)',
                      color: usuario.cargo.cor || 'hsl(var(--primary))',
                    }}
                  >
                    <Briefcase className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">
                    Cargo
                  </span>
                </div>
                <p className="text-sm font-medium ml-11">
                  {usuario.cargo.nomeCargo}
                </p>
                {usuario.cargo.descricao && (
                  <p className="text-xs text-muted-foreground ml-11 mt-1">
                    {usuario.cargo.descricao}
                  </p>
                )}
              </div>
            )}

            {usuario.equipe && (
              <div className="rounded-lg border bg-background/50 p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex items-center justify-center h-8 w-8 rounded-md bg-primary/10 text-primary">
                    <Users className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">
                    Equipe
                  </span>
                </div>
                <p className="text-sm ml-11">{usuario.equipe.nome}</p>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
