import { createFileRoute } from '@tanstack/react-router';

import { useNavigate } from '@tanstack/react-router';
import { Link } from '@tanstack/react-router';
import {
  ArrowLeft,
  Briefcase,
  Shield,
  User,
  Users,
  CalendarDays,
  Loader2,
  Trophy,
  Crown,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/core/ui/avatar';
import { Badge } from '@/core/ui/badge';
import { Button } from '@/core/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/core/ui/card';
import { Separator } from '@/core/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/core/ui/tooltip';
import { usePerfilPublico } from '@/modules/usuarios/http';
import { useAuthStore } from '@/infra/auth/auth-store';
import { dayjs } from '@/core/utils/date-utils';

export const Route = createFileRoute('/_app/equipe/$id')({
  component: PerfilMembroPage,
});


function getInitials(name: string) {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

function PerfilMembroPage() {
  const { id = null } = Route.useParams();
  const navigate = useNavigate();
  const { user: me } = useAuthStore();
  const { data: perfil, isLoading, isError } = usePerfilPublico(id);

  const isOwnProfile = me?.id === id;

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !perfil) {
    return (
      <div className="flex flex-col gap-4 p-4 md:p-8">
        <Button variant="ghost" className="w-fit gap-2" onClick={() => window.history.back()}>
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
          <User className="h-12 w-12 opacity-30" />
          <p className="text-sm">Membro não encontrado nesta corretora.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-2xl mx-auto w-full">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            {isOwnProfile ? 'Meu Perfil Público' : 'Perfil do Membro'}
          </h1>
          <p className="text-xs text-muted-foreground">
            Visível apenas para membros desta corretora
          </p>
        </div>
      </div>

      {/* Card principal */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <Avatar className="h-20 w-20 shrink-0">
              {perfil.avatarUrl && (
                <AvatarImage src={perfil.avatarUrl} alt={perfil.nome} />
              )}
              <AvatarFallback className="text-xl">
                {getInitials(perfil.nome)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-3">
              <div>
                <h2 className="text-2xl font-semibold">{perfil.nome}</h2>
                {perfil.cargo && (
                  <p className="text-sm text-muted-foreground">
                    {perfil.cargo.nome}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {perfil.cargo?.isAdmin && (
                  <Badge variant="destructive" className="gap-1">
                    <Shield className="h-3 w-3" />
                    Administrador
                  </Badge>
                )}
                {perfil.cargo?.isGestor && (
                  <Badge variant="default" className="gap-1">
                    <Briefcase className="h-3 w-3" />
                    Gestor
                  </Badge>
                )}
                {perfil.cargo?.isVendedor && (
                  <Badge variant="secondary" className="gap-1">
                    <User className="h-3 w-3" />
                    Vendedor
                  </Badge>
                )}
                {perfil.cargo && !perfil.cargo.isAdmin && !perfil.cargo.isGestor && !perfil.cargo.isVendedor && (
                  <Badge variant="outline">{perfil.cargo.nome}</Badge>
                )}
              </div>

              <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                {perfil.membroDesde && (
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" />
                    Membro desde{' '}
                    <span className="text-foreground font-medium">
                      {dayjs(perfil.membroDesde).format('MMMM [de] YYYY')}
                    </span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Equipe */}
      {perfil.equipe && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" />
              {perfil.equipe.nome}
              <Badge variant="secondary" className="ml-1">
                {perfil.equipe.membros?.length ?? 0}{' '}
                {(perfil.equipe.membros?.length ?? 0) === 1 ? 'membro' : 'membros'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <Separator />
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(perfil.equipe.membros ?? []).map((m) => {
                const isCurrentProfile = m.id === id;
                const isGestor = m.id === perfil.equipe!.gestorId;
                const isMe = m.id === me?.id;
                return (
                  <Tooltip key={m.id}>
                    <TooltipTrigger asChild>
                      <Link
                        to="/equipe/$id" params={{ id: m.id }}
                        className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 transition-colors hover:bg-muted/60 ${
                          isCurrentProfile
                            ? 'border-primary/40 bg-primary/5'
                            : 'border-border/60 bg-muted/20'
                        }`}
                      >
                        <div className="relative shrink-0">
                          <Avatar className="h-8 w-8">
                            {m.avatarUrl && (
                              <AvatarImage src={m.avatarUrl} alt={m.nome} />
                            )}
                            <AvatarFallback
                              className="text-[10px]"
                              style={
                                m.cargo?.cor
                                  ? { backgroundColor: `${m.cargo.cor}25`, color: m.cargo.cor }
                                  : undefined
                              }
                            >
                              {getInitials(m.nome)}
                            </AvatarFallback>
                          </Avatar>
                          {isGestor && (
                            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-500 text-[8px] text-white">
                              <Crown className="h-2 w-2" />
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium truncate leading-tight">
                            {m.nome.split(' ')[0]}
                            {isMe && (
                              <span className="ml-1 text-[10px] text-muted-foreground font-normal">
                                (você)
                              </span>
                            )}
                          </p>
                          {m.cargo && (
                            <p
                              className="text-[10px] truncate"
                              style={{ color: m.cargo.cor ?? undefined }}
                            >
                              {m.cargo.nome}
                            </p>
                          )}
                        </div>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>{m.nome}{isMe ? ' (você)' : ''}</p>
                      {m.cargo && <p className="text-xs opacity-70">{m.cargo.nome}</p>}
                      {isGestor && <p className="text-xs text-amber-400">Líder da equipe</p>}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Badges */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="h-4 w-4" />
            Conquistas
            {perfil.badges.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {perfil.badges.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="pt-4">
          {perfil.badges.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhuma conquista ainda.
            </p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {perfil.badges.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2"
                  title={b.badgeTipo.descricao ?? b.badgeTipo.nome}
                >
                  <span
                    className="text-xl leading-none"
                    style={{ color: b.badgeTipo.cor }}
                  >
                    {b.badgeTipo.icone}
                  </span>
                  <div>
                    <p className="text-xs font-medium leading-tight">
                      {b.badgeTipo.nome}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {dayjs(b.createdAt).format('DD/MM/YYYY')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {isOwnProfile && (
        <p className="text-xs text-muted-foreground text-center">
          Este é o seu perfil público — outros membros da corretora veem esta página.
        </p>
      )}
    </div>
  );
}
