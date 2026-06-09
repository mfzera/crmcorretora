import { createFileRoute } from '@tanstack/react-router';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminGuard } from '@/modules/admin/components/admin-guard';
import { adminApi, type AuditLogsFilters } from '@/infra/http/admin-api';
import { Input } from '@/core/ui/input';
import { Label } from '@/core/ui/label';
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/core/ui/card';
import { Badge } from '@/core/ui/badge';
import { Search } from 'lucide-react';
import { PageHeader } from '@/modules/admin/components/page-header';
import { Skeleton } from '@/core/ui/skeleton';

export const Route = createFileRoute('/_admin/admin/audit-logs')({
  component: AdminAuditLogsPage,
});


function AdminAuditLogsPage() {
  const [filters, setFilters] = useState<AuditLogsFilters>({});
  const [searchFilters, setSearchFilters] = useState<AuditLogsFilters>({});

  const { data: logs, isLoading } = useQuery({
    queryKey: ['admin', 'audit-logs', searchFilters],
    queryFn: () => adminApi.getAuditLogs(searchFilters),
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchFilters(filters);
  };

  const handleReset = () => {
    setFilters({});
    setSearchFilters({});
  };

  const formatDate = (dateStr: string): string => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return date.toLocaleString('pt-BR');
  };

  const getAcaoBadge = (acao: string) => {
    if (!acao) {
      return <Badge variant="outline">-</Badge>;
    }

    const variants: Record<
      string,
      'default' | 'secondary' | 'destructive' | 'outline'
    > = {
      criar: 'default',
      atualizar: 'secondary',
      deletar: 'destructive',
      visualizar: 'outline',
    };

    const variant = variants[acao.toLowerCase()] || 'default';
    return <Badge variant={variant}>{acao}</Badge>;
  };

  return (
    <AdminGuard requiredPermission="view_audit_logs">
      <div className="space-y-10">
        <PageHeader
          eyebrow="Segurança e compliance"
          title="Logs de auditoria"
          description="Visualize todas as ações realizadas no sistema."
        />

        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
            <CardDescription>
              Filtre os logs por corretora, usuário, ação ou período
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="acao">Ação</Label>
                  <Input
                    id="acao"
                    value={filters.acao || ''}
                    onChange={(e) =>
                      setFilters({ ...filters, acao: e.target.value })
                    }
                    placeholder="login, logout, update..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dataInicio">Data Início</Label>
                  <Input
                    id="dataInicio"
                    type="date"
                    value={filters.dataInicio || ''}
                    onChange={(e) =>
                      setFilters({ ...filters, dataInicio: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dataFim">Data Fim</Label>
                  <Input
                    id="dataFim"
                    type="date"
                    value={filters.dataFim || ''}
                    onChange={(e) =>
                      setFilters({ ...filters, dataFim: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit">
                  <Search className="h-4 w-4 mr-2" />
                  Buscar
                </Button>
                <Button type="button" variant="outline" onClick={handleReset}>
                  Limpar Filtros
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead className="hidden lg:table-cell">Entidade</TableHead>
                  <TableHead className="hidden md:table-cell">IP</TableHead>
                  <TableHead className="max-w-xs hidden md:table-cell">Detalhes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs?.map((log, index) => (
                  <TableRow key={log.id || `log-${index}`}>
                    <TableCell className="text-sm">
                      {formatDate(log.timestamp)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">
                          {log.adminName || 'Unknown'}
                        </span>
                        {log.adminEmail && (
                          <span className="text-xs text-muted-foreground">
                            {log.adminEmail}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getAcaoBadge(log.acao)}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {log.entidadeTipo ? (
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">
                            {log.entidadeTipo}
                          </span>
                          {log.entidadeId && (
                            <span className="font-mono text-xs text-muted-foreground">
                              {log.entidadeId.substring(0, 8)}...
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden md:table-cell">
                      {log.ip || '-'}
                    </TableCell>
                    <TableCell className="max-w-xs hidden md:table-cell">
                      <details className="cursor-pointer">
                        <summary className="text-sm text-muted-foreground hover:text-foreground">
                          Ver detalhes
                        </summary>
                        <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                          {JSON.stringify(log.detalhes, null, 2)}
                        </pre>
                      </details>
                    </TableCell>
                  </TableRow>
                ))}
                {logs?.length === 0 && (
                  <TableRow key="empty-state">
                    <TableCell
                      colSpan={6}
                      className="text-center py-8 text-muted-foreground"
                    >
                      Nenhum log encontrado com os filtros aplicados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </AdminGuard>
  );
}
