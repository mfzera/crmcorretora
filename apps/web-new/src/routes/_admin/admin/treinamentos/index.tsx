import { createFileRoute } from '@tanstack/react-router';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { AdminGuard } from '@/modules/admin/components/admin-guard';
import { treinamentosApi, type Curso } from '@/infra/http/treinamentos-api';
import { Button } from '@/core/ui/button';
import { Input } from '@/core/ui/input';
import { Label } from '@/core/ui/label';
import { Textarea } from '@/core/ui/textarea';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/core/ui/card';
import { Skeleton } from '@/core/ui/skeleton';
import { toast } from 'sonner';
import {
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Users,
  BookOpen,
  ChevronRight,
  TrendingUp,
  ImagePlus,
} from 'lucide-react';
import { PageHeader } from '@/modules/admin/components/page-header';

export const Route = createFileRoute('/_admin/admin/treinamentos/')({
  component: TreinamentosPage,
});


function StatsCards() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['treinamentos', 'stats'],
    queryFn: () => treinamentosApi.getStats(),
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Usuários Ativos</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{stats.usuariosAtivos}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Aulas Concluídas</CardTitle>
          <BookOpen className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{stats.aulasConcluidas}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Média de Aprovação</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{stats.mediaAprovacao.toFixed(1)}%</p>
        </CardContent>
      </Card>
    </div>
  );
}

interface CursoFormData {
  titulo: string;
  descricao: string;
  thumbnailUrl: string | null;
  ordem: number;
}

interface CursoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  curso?: Curso | null;
  onSuccess: () => void;
}

function CursoDialog({ open, onOpenChange, curso, onSuccess }: CursoDialogProps) {
  const [form, setForm] = useState<CursoFormData>({
    titulo: curso?.titulo ?? '',
    descricao: curso?.descricao ?? '',
    thumbnailUrl: curso?.thumbnailUrl ?? null,
    ordem: curso?.ordem ?? 0,
  });
  const [uploadingThumb, setUploadingThumb] = useState(false);

  const isEdit = !!curso;

  const mutation = useMutation({
    mutationFn: (data: CursoFormData) =>
      isEdit
        ? treinamentosApi.updateCurso(curso!.id, data)
        : treinamentosApi.createCurso(data),
    onSuccess: () => {
      toast.success(isEdit ? 'Curso atualizado' : 'Curso criado');
      onSuccess();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error('Erro ao salvar curso', { description: error.message });
    },
  });

  const handleThumbnail = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingThumb(true);
    try {
      const { url } = await treinamentosApi.uploadImagem(file, 'thumbnails');
      setForm((f) => ({ ...f, thumbnailUrl: url }));
    } catch (err: unknown) {
      toast.error('Erro ao enviar imagem', {
        description: err instanceof Error ? err.message : 'Tente novamente',
      });
    } finally {
      setUploadingThumb(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.titulo.trim()) return;
    mutation.mutate(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Curso' : 'Novo Curso'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titulo">Título *</Label>
            <Input
              id="titulo"
              value={form.titulo}
              onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
              placeholder="Nome do curso"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={form.descricao}
              onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
              placeholder="Descrição do curso"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label>Thumbnail</Label>
            {form.thumbnailUrl ? (
              <div className="relative w-full max-w-[240px]">
                <img
                  src={form.thumbnailUrl}
                  alt="Thumbnail do curso"
                  className="rounded-md border object-cover w-full aspect-video"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="absolute bottom-2 right-2 text-xs"
                  disabled={uploadingThumb}
                  onClick={() => document.getElementById('curso-thumb')?.click()}
                >
                  Alterar
                </Button>
              </div>
            ) : (
              <button
                type="button"
                disabled={uploadingThumb}
                className="flex items-center gap-2 rounded-md border border-dashed px-4 py-6 w-full text-sm text-muted-foreground hover:bg-muted/40 transition-colors"
                onClick={() => document.getElementById('curso-thumb')?.click()}
              >
                <ImagePlus className="h-5 w-5" />
                {uploadingThumb ? 'Enviando...' : 'Selecionar imagem'}
              </button>
            )}
            <input
              id="curso-thumb"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleThumbnail}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ordem">Ordem</Label>
            <Input
              id="ordem"
              type="number"
              value={form.ordem}
              onChange={(e) => setForm((f) => ({ ...f, ordem: Number(e.target.value) }))}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending || uploadingThumb}>
              {mutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TreinamentosPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingCurso, setEditingCurso] = useState<Curso | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: cursos, isLoading } = useQuery({
    queryKey: ['treinamentos', 'cursos'],
    queryFn: () => treinamentosApi.getCursos(),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['treinamentos', 'cursos'] });

  const publishMutation = useMutation({
    mutationFn: ({ id, publicado }: { id: string; publicado: boolean }) =>
      treinamentosApi.updateCurso(id, { publicado }),
    onSuccess: (_, vars) => {
      invalidate();
      toast.success(vars.publicado ? 'Curso publicado' : 'Curso despublicado');
    },
    onError: (error: Error) => toast.error('Erro', { description: error.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => treinamentosApi.deleteCurso(id),
    onSuccess: () => {
      invalidate();
      setDeletingId(null);
      toast.success('Curso removido');
    },
    onError: (error: Error) => toast.error('Erro ao remover', { description: error.message }),
  });

  return (
    <AdminGuard>
      <div className="space-y-10">
        <PageHeader
          eyebrow="Academia interna"
          title="Treinamentos"
          description="Cursos e trilhas de aprendizagem disponíveis aos usuários."
          actions={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Curso
            </Button>
          }
        />

        <StatsCards />

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Ordem</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!cursos?.length ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      Nenhum curso cadastrado
                    </TableCell>
                  </TableRow>
                ) : (
                  cursos.map((curso) => (
                    <TableRow
                      key={curso.id}
                      className="cursor-pointer"
                      onClick={() => navigate({ to: `/admin/treinamentos/${curso.id}` })}
                    >
                      <TableCell className="font-medium">{curso.titulo}</TableCell>
                      <TableCell>{curso.ordem}</TableCell>
                      <TableCell>
                        <Badge variant={curso.publicado ? 'default' : 'secondary'}>
                          {curso.publicado ? 'Publicado' : 'Rascunho'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div
                          className="flex justify-end gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            title={curso.publicado ? 'Despublicar' : 'Publicar'}
                            onClick={() =>
                              publishMutation.mutate({ id: curso.id, publicado: !curso.publicado })
                            }
                          >
                            {curso.publicado ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Gerenciar módulos e aulas"
                            onClick={() => navigate({ to: `/admin/treinamentos/${curso.id}` })}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            title="Remover curso"
                            onClick={() => setDeletingId(curso.id)}
                          >
                            <Trash2 className="h-4 w-4" />
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

        <CursoDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onSuccess={invalidate}
        />

        <CursoDialog
          open={!!editingCurso}
          onOpenChange={(open) => !open && setEditingCurso(null)}
          curso={editingCurso}
          onSuccess={invalidate}
        />

        <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover curso?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação remove o curso e todos os módulos e aulas vinculados. Não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => deletingId && deleteMutation.mutate(deletingId)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'Removendo...' : 'Remover'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminGuard>
  );
}
