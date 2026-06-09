import { createFileRoute } from '@tanstack/react-router';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminGuard } from '@/modules/admin/components/admin-guard';
import { adminApi, type Changelog } from '@/infra/http/admin-api';
import { Button } from '@/core/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/core/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/core/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/core/ui/alert-dialog';
import { Badge } from '@/core/ui/badge';
import { toast } from 'sonner';
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  BookOpen,
  Rocket,
} from 'lucide-react';
import { PageHeader } from '@/modules/admin/components/page-header';
import { Skeleton } from '@/core/ui/skeleton';
import { CreateChangelogDialog } from '@/modules/admin/components/changelog/create-changelog-dialog';
import { EditChangelogDialog } from '@/modules/admin/components/changelog/edit-changelog-dialog';
import { ManageItemsDialog } from '@/modules/admin/components/changelog/manage-items-dialog';

export const Route = createFileRoute('/_admin/admin/changelogs')({
  component: AdminChangelogsPage,
});


function AdminChangelogsPage() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingChangelog, setEditingChangelog] = useState<Changelog | null>(
    null,
  );
  const [managingItemsChangelog, setManagingItemsChangelog] =
    useState<Changelog | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'changelogs'],
    queryFn: () => adminApi.getChangelogs(),
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => adminApi.publishChangelog(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'changelogs'] });
      toast.success('Changelog publicado com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao publicar changelog', {
        description: error.message,
      });
    },
  });

  const unpublishMutation = useMutation({
    mutationFn: (id: string) => adminApi.unpublishChangelog(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'changelogs'] });
      toast.success('Changelog despublicado com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao despublicar changelog', {
        description: error.message,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteChangelog(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'changelogs'] });
      toast.success('Changelog deletado com sucesso');
      setDeletingId(null);
    },
    onError: (error: Error) => {
      toast.error('Erro ao deletar changelog', {
        description: error.message,
      });
    },
  });

  const formatDate = (dateStr: string): string => {
    const date = dateStr.includes('T') ? new Date(dateStr) : new Date(`${dateStr}T12:00:00Z`);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const changelogs = data?.changelogs || [];

  return (
    <AdminGuard requiredPermission="view_changelogs">
      <div className="space-y-10">
        <PageHeader
          eyebrow="Comunicação de release"
          title="Changelogs"
          description="Gerencie as versões e atualizações do sistema."
          actions={
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Changelog
            </Button>
          }
        />

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Versão</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead className="hidden md:table-cell">Data de Lançamento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Itens</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {changelogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <BookOpen className="h-12 w-12 opacity-20" />
                        <p>Nenhum changelog encontrado</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCreateDialogOpen(true)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Criar primeiro changelog
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  changelogs.map((changelog) => (
                    <TableRow key={changelog.id}>
                      <TableCell className="font-semibold">
                        {changelog.version}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div>
                          <div className="font-medium truncate">{changelog.title}</div>
                          {changelog.description && (
                            <div className="text-sm text-muted-foreground line-clamp-1">
                              {changelog.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{formatDate(changelog.releaseDate)}</TableCell>
                      <TableCell>
                        {changelog.isPublished ? (
                          <Badge variant="default" className="gap-1">
                            <Rocket className="h-3 w-3" />
                            Publicado
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Rascunho</Badge>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="outline">
                          {changelog.items?.length || 0} itens
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setManagingItemsChangelog(changelog)}
                            title="Gerenciar itens"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingChangelog(changelog)}
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {changelog.isPublished ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                unpublishMutation.mutate(changelog.id)
                              }
                              disabled={unpublishMutation.isPending}
                              title="Despublicar"
                            >
                              <EyeOff className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                publishMutation.mutate(changelog.id)
                              }
                              disabled={publishMutation.isPending}
                              title="Publicar"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingId(changelog.id)}
                            title="Deletar"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <CreateChangelogDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      {editingChangelog && (
        <EditChangelogDialog
          changelog={editingChangelog}
          open={!!editingChangelog}
          onOpenChange={(open) => !open && setEditingChangelog(null)}
        />
      )}

      {managingItemsChangelog && (
        <ManageItemsDialog
          changelog={managingItemsChangelog}
          open={!!managingItemsChangelog}
          onOpenChange={(open) => !open && setManagingItemsChangelog(null)}
        />
      )}

      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar este changelog? Esta ação não pode
              ser desfeita e todos os itens associados também serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingId && deleteMutation.mutate(deletingId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminGuard>
  );
}
