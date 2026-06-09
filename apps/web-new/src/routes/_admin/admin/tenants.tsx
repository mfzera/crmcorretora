import { createFileRoute } from '@tanstack/react-router';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminGuard } from '@/modules/admin/components/admin-guard';
import { adminApi, type Tenant } from '@/infra/http/admin-api';
import { Button } from '@/core/ui/button';
import { Input } from '@/core/ui/input';
import { Label } from '@/core/ui/label';
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
  DialogTrigger,
} from '@/core/ui/dialog';
import { Badge } from '@/core/ui/badge';
import { toast } from 'sonner';
import { Settings } from 'lucide-react';
import { Skeleton } from '@/core/ui/skeleton';
import { PageHeader } from '@/modules/admin/components/page-header';

export const Route = createFileRoute('/_admin/admin/tenants')({
  component: AdminTenantsPage,
});


function AdminTenantsPage() {
  const { data: tenants, isLoading } = useQuery({
    queryKey: ['admin', 'tenants'],
    queryFn: () => adminApi.getTenants(),
  });

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  return (
    <AdminGuard requiredPermission="manage_tenants">
      <div className="space-y-10">
        <PageHeader
          eyebrow="Gerenciamento"
          title="Corretoras"
          description="Visualize e gerencie todas as corretoras do sistema."
        />

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="hidden md:table-cell">CNPJ</TableHead>
                  <TableHead>Armazenamento</TableHead>
                  <TableHead className="hidden lg:table-cell">Uso</TableHead>
                  <TableHead className="hidden md:table-cell">Criado Em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants?.map((tenant) => (
                  <TableRow key={tenant.id}>
                    <TableCell className="font-medium">{tenant.nome}</TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs hidden md:table-cell">
                      {tenant.cnpj || '—'}
                    </TableCell>
                    <TableCell>
                      {formatBytes(tenant.limits.bytesUsed)} /{' '}
                      {tenant.limits.bytesLimit ? formatBytes(tenant.limits.bytesLimit) : '∞'}
                      {tenant.limits.shouldAlert && (
                        <Badge variant="destructive" className="ml-2 text-xs">Alerta</Badge>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <span className="text-sm">{tenant.usage.totalFiles} arquivos</span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{formatDate(tenant.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <EditLimitsDialog tenant={tenant} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </AdminGuard>
  );
}

interface EditLimitsDialogProps {
  tenant: Tenant;
}

function EditLimitsDialog({ tenant }: EditLimitsDialogProps) {
  const [open, setOpen] = useState(false);
  const [storageLimit, setStorageLimit] = useState(
    tenant.limits.bytesLimit ? (tenant.limits.bytesLimit / 1024 ** 3).toString() : '',
  );
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (limits: { limiteBytes: number }) =>
      adminApi.updateTenantLimits(tenant.id, limits),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'tenants'] });
      toast.success('Limites atualizados', {
        description: 'Os limites da corretora foram atualizados com sucesso.',
      });
      setOpen(false);
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar limites', {
        description: error.message,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      limiteBytes: parseFloat(storageLimit) * 1024 ** 3,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Limites - {tenant.nome}</DialogTitle>
          <DialogDescription>
            Ajuste os limites de armazenamento e usuários para esta corretora.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="storage">Limite de Armazenamento (GB)</Label>
            <Input
              id="storage"
              type="number"
              step="0.1"
              placeholder="Ex: 10"
              value={storageLimit}
              onChange={(e) => setStorageLimit(e.target.value)}
              required
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
