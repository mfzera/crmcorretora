
import { useState } from 'react';
import {
  Loader2,
  MoreVertical,
  Edit,
  Trash2,
  Users,
  Eye,
  Plus,
  Search,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/core/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/core/ui/dropdown-menu';
import { Badge } from '@/core/ui/badge';
import { Button } from '@/core/ui/button';
import { Input } from '@/core/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/core/ui/avatar';
import { Separator } from '@/core/ui/separator';
import { useEquipes } from '@/modules/equipes/http';
import { useAuthStore } from '@/infra/auth/auth-store';
import { EquipeDialog } from './equipe-dialog';
import { EquipeDetailDialog } from './equipe-detail-dialog';
import { ExcluirEquipeDialog } from './excluir-equipe-dialog';
import type { Equipe } from '@/types/equipe';

function getInitials(nome: string) {
  return nome
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function EquipesTab() {
  const { user } = useAuthStore();
  const isAdmin = user?.isAdmin;

  const [search, setSearch] = useState('');
  const [equipeSelecionada, setEquipeSelecionada] = useState<Equipe | null>(null);
  const [dialogCriarOpen, setDialogCriarOpen] = useState(false);
  const [dialogEditarOpen, setDialogEditarOpen] = useState(false);
  const [dialogDetalhesOpen, setDialogDetalhesOpen] = useState(false);
  const [dialogExcluirOpen, setDialogExcluirOpen] = useState(false);

  const { data, isLoading } = useEquipes({ limit: 100 });
  const equipes = data?.data ?? [];

  const equipesFiltradas = equipes.filter((e) =>
    e.nome.toLowerCase().includes(search.toLowerCase()),
  );

  const ativas = equipes.filter((e) => e.ativo).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar equipes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {isAdmin && (
          <Button onClick={() => setDialogCriarOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Equipe
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <p className="text-sm text-muted-foreground">Total de Equipes</p>
            <p className="text-3xl font-bold">{equipes.length}</p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <p className="text-sm text-muted-foreground">Equipes Ativas</p>
            <p className="text-3xl font-bold">{ativas}</p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <p className="text-sm text-muted-foreground">Equipes Inativas</p>
            <p className="text-3xl font-bold">{equipes.length - ativas}</p>
          </CardHeader>
        </Card>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : equipesFiltradas.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-20" />
            <p className="text-muted-foreground text-lg font-medium mb-2">
              {equipes.length === 0
                ? 'Nenhuma equipe cadastrada ainda'
                : 'Nenhuma equipe encontrada'}
            </p>
            {isAdmin && equipes.length === 0 && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setDialogCriarOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Criar primeira equipe
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {equipesFiltradas.map((equipe) => (
            <Card
              key={equipe.id}
              className="transition-all duration-200 hover:shadow-lg"
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 space-y-1.5">
                    <p className="font-semibold text-base leading-tight line-clamp-1">
                      {equipe.nome}
                    </p>
                    <Badge variant={equipe.ativo ? 'default' : 'secondary'}>
                      {equipe.ativo ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                        <MoreVertical className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Ações</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => {
                          setEquipeSelecionada(equipe);
                          setDialogDetalhesOpen(true);
                        }}
                      >
                        <Eye className="mr-2 size-4" />
                        Ver Detalhes
                      </DropdownMenuItem>
                      {isAdmin && (
                        <>
                          <DropdownMenuItem
                            onClick={() => {
                              setEquipeSelecionada(equipe);
                              setDialogEditarOpen(true);
                            }}
                          >
                            <Edit className="mr-2 size-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setEquipeSelecionada(equipe);
                              setDialogExcluirOpen(true);
                            }}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 size-4" />
                            Excluir
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {equipe.gestor ? (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={equipe.gestor.avatarUrl ?? undefined} />
                      <AvatarFallback className="text-xs">
                        {getInitials(equipe.gestor.nome)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Lider</p>
                      <p className="text-sm font-medium truncate">{equipe.gestor.nome}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Sem lider atribuído</p>
                )}
              </CardContent>

              <CardFooter className="flex flex-col gap-2 pt-0">
                <Separator />
                <div className="flex items-center justify-between w-full text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    <span>
                      {equipe.totalMembros} membro{equipe.totalMembros !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <span>
                    {new Date(equipe.createdAt).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Dialogs */}
      <EquipeDialog
        open={dialogCriarOpen}
        onOpenChange={setDialogCriarOpen}
      />

      <EquipeDialog
        open={dialogEditarOpen}
        onOpenChange={(open) => {
          setDialogEditarOpen(open);
          if (!open) setEquipeSelecionada(null);
        }}
        equipe={equipeSelecionada}
      />

      <EquipeDetailDialog
        open={dialogDetalhesOpen}
        onOpenChange={(open) => {
          setDialogDetalhesOpen(open);
          if (!open) setEquipeSelecionada(null);
        }}
        equipe={equipeSelecionada}
        onEdit={() => {
          setDialogDetalhesOpen(false);
          setDialogEditarOpen(true);
        }}
      />

      <ExcluirEquipeDialog
        open={dialogExcluirOpen}
        onOpenChange={(open) => {
          setDialogExcluirOpen(open);
          if (!open) setEquipeSelecionada(null);
        }}
        equipe={equipeSelecionada}
      />
    </div>
  );
}
