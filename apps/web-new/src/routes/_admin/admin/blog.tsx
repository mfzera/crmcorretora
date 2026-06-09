import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminGuard } from '@/modules/admin/components/admin-guard';
import { adminApi, type BlogPost } from '@/infra/http/admin-api';
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
import { Plus, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import { PageHeader } from '@/modules/admin/components/page-header';
import { Skeleton } from '@/core/ui/skeleton';
import { Input } from '@/core/ui/input';
import { Textarea } from '@/core/ui/textarea';
import { Label } from '@/core/ui/label';

export const Route = createFileRoute('/_admin/admin/blog')({
  component: AdminBlogPage,
});

interface PostFormData {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverImageUrl: string;
}

const emptyForm: PostFormData = {
  slug: '',
  title: '',
  excerpt: '',
  content: '',
  coverImageUrl: '',
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function AdminBlogPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [form, setForm] = useState<PostFormData>(emptyForm);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'blog', 'posts'],
    queryFn: () => adminApi.getBlogPosts(),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['admin', 'blog', 'posts'] });

  const createMutation = useMutation({
    mutationFn: (d: PostFormData) =>
      adminApi.createBlogPost({
        ...d,
        coverImageUrl: d.coverImageUrl || null,
      }),
    onSuccess: () => {
      invalidate();
      toast.success('Post criado com sucesso');
      setFormOpen(false);
      setForm(emptyForm);
    },
    onError: (e: Error) => toast.error('Erro ao criar post', { description: e.message }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, d }: { id: string; d: PostFormData }) =>
      adminApi.updateBlogPost(id, {
        ...d,
        coverImageUrl: d.coverImageUrl || null,
      }),
    onSuccess: () => {
      invalidate();
      toast.success('Post atualizado com sucesso');
      setFormOpen(false);
      setEditingPost(null);
      setForm(emptyForm);
    },
    onError: (e: Error) => toast.error('Erro ao atualizar post', { description: e.message }),
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => adminApi.publishBlogPost(id),
    onSuccess: () => { invalidate(); toast.success('Post publicado'); },
    onError: (e: Error) => toast.error('Erro ao publicar', { description: e.message }),
  });

  const unpublishMutation = useMutation({
    mutationFn: (id: string) => adminApi.unpublishBlogPost(id),
    onSuccess: () => { invalidate(); toast.success('Post despublicado'); },
    onError: (e: Error) => toast.error('Erro ao despublicar', { description: e.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteBlogPost(id),
    onSuccess: () => {
      invalidate();
      toast.success('Post excluído');
      setDeletingId(null);
    },
    onError: (e: Error) => toast.error('Erro ao excluir post', { description: e.message }),
  });

  const openCreate = () => {
    setEditingPost(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (post: BlogPost) => {
    setEditingPost(post);
    setForm({
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      content: post.content,
      coverImageUrl: post.coverImageUrl ?? '',
    });
    setFormOpen(true);
  };

  const handleSubmit = () => {
    if (editingPost) {
      updateMutation.mutate({ id: editingPost.id, d: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const posts = data?.posts ?? [];

  const formatDate = (s: string) =>
    new Date(s).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

  return (
    <AdminGuard requiredPermission="manage_changelogs">
      <div className="space-y-10">
        <PageHeader
          eyebrow="Conteúdo"
          title="Blog"
          description="Crie e publique posts do blog."
          actions={
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Post
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
                  <TableHead>Título</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {posts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Nenhum post criado ainda.
                    </TableCell>
                  </TableRow>
                ) : (
                  posts.map((post) => (
                    <TableRow key={post.id}>
                      <TableCell className="font-medium max-w-[260px] truncate">
                        {post.title}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {post.slug}
                      </TableCell>
                      <TableCell>
                        <Badge variant={post.isPublished ? 'default' : 'secondary'}>
                          {post.isPublished ? 'Publicado' : 'Rascunho'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(post.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 justify-end">
                          {post.isPublished ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => unpublishMutation.mutate(post.id)}
                              disabled={unpublishMutation.isPending}
                              title="Despublicar"
                            >
                              <EyeOff className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => publishMutation.mutate(post.id)}
                              disabled={publishMutation.isPending}
                              title="Publicar"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEdit(post)}
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeletingId(post.id)}
                            title="Excluir"
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

        {/* Create / Edit Dialog */}
        <Dialog
          open={formOpen}
          onOpenChange={(open) => {
            if (!open) {
              setFormOpen(false);
              setEditingPost(null);
              setForm(emptyForm);
            }
          }}
        >
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPost ? 'Editar Post' : 'Novo Post'}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => {
                    const title = e.target.value;
                    setForm((f) => ({
                      ...f,
                      title,
                      slug: editingPost ? f.slug : slugify(title),
                    }));
                  }}
                  placeholder="Título do post"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  placeholder="meu-post-slug"
                  className="font-mono text-sm"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="excerpt">Resumo</Label>
                <Textarea
                  id="excerpt"
                  value={form.excerpt}
                  onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
                  placeholder="Breve descrição do post..."
                  rows={3}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="coverImageUrl">URL da imagem de capa (opcional)</Label>
                <Input
                  id="coverImageUrl"
                  value={form.coverImageUrl}
                  onChange={(e) => setForm((f) => ({ ...f, coverImageUrl: e.target.value }))}
                  placeholder="https://..."
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="content">Conteúdo (Markdown)</Label>
                <Textarea
                  id="content"
                  value={form.content}
                  onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                  placeholder="# Título&#10;&#10;Conteúdo em Markdown..."
                  rows={14}
                  className="font-mono text-sm"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setFormOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={isSaving}>
                {isSaving ? 'Salvando...' : editingPost ? 'Salvar alterações' : 'Criar post'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete confirmation */}
        <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir post?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. O post será removido permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deletingId && deleteMutation.mutate(deletingId)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminGuard>
  );
}
