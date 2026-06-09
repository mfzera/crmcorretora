import { createFileRoute } from '@tanstack/react-router';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminGuard } from '@/modules/admin/components/admin-guard';
import { adminApi, type RoadmapPhase } from '@/infra/http/admin-api';
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
import { Plus, Edit, Trash2, Eye, EyeOff, Map as MapIcon, ListChecks, Rocket } from 'lucide-react';
import { PageHeader } from '@/modules/admin/components/page-header';
import { Skeleton } from '@/core/ui/skeleton';
import { CreatePhaseDialog } from '@/modules/admin/components/roadmap/create-phase-dialog';
import { EditPhaseDialog } from '@/modules/admin/components/roadmap/edit-phase-dialog';
import { ManageItemsDialog } from '@/modules/admin/components/roadmap/manage-items-dialog';

export const Route = createFileRoute('/_admin/admin/roadmap')({
  component: AdminRoadmapPage,
});


function formatEstimatedDate(dateStr: string | undefined): string {
  if (!dateStr) return '—';
  const [year, month] = dateStr.split('-');
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

function AdminRoadmapPage() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingPhase, setEditingPhase] = useState<RoadmapPhase | null>(null);
  const [managingPhase, setManagingPhase] = useState<RoadmapPhase | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'roadmap'],
    queryFn: () => adminApi.getRoadmapPhases(),
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => adminApi.publishRoadmapPhase(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'roadmap'] });
      toast.success('Fase publicada com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao publicar fase', { description: error.message });
    },
  });

  const unpublishMutation = useMutation({
    mutationFn: (id: string) => adminApi.unpublishRoadmapPhase(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'roadmap'] });
      toast.success('Fase despublicada com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao despublicar fase', { description: error.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteRoadmapPhase(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'roadmap'] });
      toast.success('Fase deletada com sucesso');
      setDeletingId(null);
    },
    onError: (error: Error) => {
      toast.error('Erro ao deletar fase', { description: error.message });
    },
  });

  const phases = data?.phases || [];

  return (
    <AdminGuard requiredPermission="view_roadmap">
      <div className="space-y-10">
        <PageHeader
          eyebrow="Planejamento de produto"
          title="Roadmap"
          description="Gerencie as fases e itens do roadmap público."
          actions={
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Fase
            </Button>
          }
        />

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome da Fase</TableHead>
                  <TableHead>Data Estimada</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Itens</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {phases.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <MapIcon className="h-12 w-12 opacity-20" />
                        <p>Nenhuma fase encontrada</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCreateDialogOpen(true)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Criar primeira fase
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  phases.map((phase, i) => (
                    <TableRow key={phase.id ?? i}>
                      <TableCell className="font-medium">{phase.name}</TableCell>
                      <TableCell className="capitalize">
                        {formatEstimatedDate(phase.estimatedDate)}
                      </TableCell>
                      <TableCell>
                        {phase.isPublished ? (
                          <Badge variant="default" className="gap-1">
                            <Rocket className="h-3 w-3" />
                            Publicado
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Rascunho</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {phase.items?.length || 0} itens
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setManagingPhase(phase)}
                            title="Gerenciar itens"
                          >
                            <ListChecks className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingPhase(phase)}
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {phase.isPublished ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => unpublishMutation.mutate(phase.id)}
                              disabled={unpublishMutation.isPending}
                              title="Despublicar"
                            >
                              <EyeOff className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => publishMutation.mutate(phase.id)}
                              disabled={publishMutation.isPending}
                              title="Publicar"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingId(phase.id)}
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

      <CreatePhaseDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      {editingPhase && (
        <EditPhaseDialog
          phase={editingPhase}
          open={!!editingPhase}
          onOpenChange={(open) => !open && setEditingPhase(null)}
        />
      )}

      {managingPhase && (
        <ManageItemsDialog
          phase={managingPhase}
          open={!!managingPhase}
          onOpenChange={(open) => !open && setManagingPhase(null)}
        />
      )}

      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar esta fase? Todos os itens associados
              também serão removidos. Esta ação não pode ser desfeita.
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
