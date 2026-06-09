# 11 - Frontend Admin (Painel Administrativo)

**Navegação**: [← 10. Frontend Anexos](./10-FRONTEND-ANEXOS.md) | [Índice](./00-INDICE.md) | [12. Workers/Jobs →](./12-WORKERS-JOBS.md)

---

## 🎯 Visão Geral

Aplicação administrativa Next.js **separada** para super-admins gerenciarem todo o sistema multi-tenant.

**Características:**
- App Next.js independente (`apps/admin/`)
- Autenticação separada (admin JWT)
- Acesso a todos os tenants
- Monitoramento de uso e custos
- Gestão de backups
- Audit logs de ações administrativas

## 📁 Estrutura de Arquivos

```
apps/admin/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/
│   │   │       └── page.tsx              # Login admin
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx                # Layout com sidebar
│   │   │   ├── page.tsx                  # Dashboard principal
│   │   │   ├── tenants/
│   │   │   │   ├── page.tsx              # Lista de tenants
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx          # Detalhes do tenant
│   │   │   │       ├── storage/page.tsx  # Uso de storage
│   │   │   │       ├── backups/page.tsx  # Backups
│   │   │   │       └── limits/page.tsx   # Configurar limites
│   │   │   ├── backups/
│   │   │   │   ├── page.tsx              # Todos os backups
│   │   │   │   └── [id]/page.tsx         # Detalhes do backup
│   │   │   ├── audit-logs/
│   │   │   │   └── page.tsx              # Logs de auditoria
│   │   │   └── settings/
│   │   │       └── page.tsx              # Configurações globais
│   │   └── globals.css
│   ├── components/
│   │   ├── dashboard/
│   │   │   ├── stats-cards.tsx           # Cards de estatísticas
│   │   │   ├── usage-chart.tsx           # Gráfico de uso
│   │   │   ├── tenants-table.tsx         # Tabela de tenants
│   │   │   └── alerts-list.tsx           # Lista de alertas
│   │   ├── tenants/
│   │   │   ├── tenant-details.tsx
│   │   │   ├── storage-breakdown.tsx     # Breakdown por tipo
│   │   │   ├── usage-history-chart.tsx   # Gráfico histórico
│   │   │   └── edit-limits-dialog.tsx    # Editar limites
│   │   ├── backups/
│   │   │   ├── backups-table.tsx
│   │   │   ├── backup-details.tsx
│   │   │   ├── create-backup-dialog.tsx
│   │   │   ├── restore-backup-dialog.tsx
│   │   │   └── verify-backup-button.tsx
│   │   ├── audit/
│   │   │   ├── audit-logs-table.tsx
│   │   │   └── audit-log-details.tsx
│   │   ├── layout/
│   │   │   ├── sidebar.tsx
│   │   │   ├── topbar.tsx
│   │   │   └── admin-guard.tsx           # Proteção de rotas admin
│   │   └── shared/
│   │       ├── format-bytes.tsx
│   │       ├── status-badge.tsx
│   │       └── loading-spinner.tsx
│   ├── lib/
│   │   ├── admin-api.ts                  # Client para API admin
│   │   ├── admin-auth.ts                 # Gerenciamento de auth admin
│   │   └── queries/
│   │       ├── dashboard.ts
│   │       ├── tenants.ts
│   │       ├── backups.ts
│   │       └── audit-logs.ts
│   └── providers/
│       └── admin-providers.tsx           # React Query + Auth
├── .env.local
├── next.config.js
├── package.json
└── tsconfig.json
```

## 🔐 Autenticação Admin

### Login Page

```typescript
// apps/admin/src/app/(auth)/login/page.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminAuth } from '@/lib/admin-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await adminAuth.login(email, senha);
      router.push('/'); // Dashboard
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Painel Administrativo</CardTitle>
          <CardDescription>
            Entre com suas credenciais de administrador
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@ecotech.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="senha">Senha</Label>
              <Input
                id="senha"
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Entrar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

### Admin Auth Service

```typescript
// apps/admin/src/lib/admin-auth.ts

interface AdminUser {
  id: string;
  nome: string;
  email: string;
  permissoes: string[];
}

interface LoginResponse {
  admin: AdminUser;
  token: string;
  expiresIn: string;
}

class AdminAuthService {
  private tokenKey = 'admin_token';
  private userKey = 'admin_user';

  async login(email: string, senha: string): Promise<AdminUser> {
    const response = await fetch('/api/admin/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao fazer login');
    }

    const data: { success: boolean; data: LoginResponse } = await response.json();

    // Salvar token e usuário
    localStorage.setItem(this.tokenKey, data.data.token);
    localStorage.setItem(this.userKey, JSON.stringify(data.data.admin));

    return data.data.admin;
  }

  async logout(): Promise<void> {
    const token = this.getToken();

    if (token) {
      try {
        await fetch('/api/admin/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (error) {
        console.error('Erro ao fazer logout:', error);
      }
    }

    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  getUser(): AdminUser | null {
    const userJson = localStorage.getItem(this.userKey);
    return userJson ? JSON.parse(userJson) : null;
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  hasPermission(permission: string): boolean {
    const user = this.getUser();
    return user?.permissoes.includes(permission) ?? false;
  }
}

export const adminAuth = new AdminAuthService();
```

### Admin Guard Component

```typescript
// apps/admin/src/components/layout/admin-guard.tsx

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { adminAuth } from '@/lib/admin-auth';

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    if (!adminAuth.isAuthenticated()) {
      router.push('/login');
    }
  }, [router]);

  if (!adminAuth.isAuthenticated()) {
    return null;
  }

  return <>{children}</>;
}
```

## 📊 Dashboard Principal

```typescript
// apps/admin/src/app/(dashboard)/page.tsx

'use client';

import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/admin-api';
import { StatsCards } from '@/components/dashboard/stats-cards';
import { UsageChart } from '@/components/dashboard/usage-chart';
import { TenantsTable } from '@/components/dashboard/tenants-table';
import { AlertsList } from '@/components/dashboard/alerts-list';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin', 'global-stats'],
    queryFn: () => adminApi.getGlobalStats(),
  });

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Visão geral do sistema multi-tenant
        </p>
      </div>

      {/* Cards de Estatísticas */}
      <StatsCards stats={stats} />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Gráfico de Uso */}
        <UsageChart className="md:col-span-2" />

        {/* Alertas */}
        <AlertsList />

        {/* Tenants Próximos do Limite */}
        <TenantsTable tenants={stats?.corretorasProximasLimite || []} />
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-10 w-64" />
        <Skeleton className="mt-2 h-5 w-96" />
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <Skeleton className="h-96" />
    </div>
  );
}
```

### Stats Cards Component

```typescript
// apps/admin/src/components/dashboard/stats-cards.tsx

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatBytes } from '@/lib/utils';
import { Building2, Files, DollarSign, TrendingUp } from 'lucide-react';

interface GlobalStats {
  totalCorretoras: number;
  totalArquivos: number;
  totalBytes: string;
  custoEstimadoMensal: number;
  crescimentoUltimos30Dias: string;
}

export function StatsCards({ stats }: { stats?: GlobalStats }) {
  if (!stats) return null;

  const cards = [
    {
      title: 'Total de Tenants',
      value: stats.totalCorretoras,
      icon: Building2,
      color: 'text-blue-600',
    },
    {
      title: 'Total de Arquivos',
      value: stats.totalArquivos.toLocaleString('pt-BR'),
      icon: Files,
      color: 'text-green-600',
    },
    {
      title: 'Storage Usado',
      value: formatBytes(BigInt(stats.totalBytes)),
      icon: TrendingUp,
      color: 'text-purple-600',
    },
    {
      title: 'Custo Mensal',
      value: `$${stats.custoEstimadoMensal.toFixed(2)}`,
      icon: DollarSign,
      color: 'text-orange-600',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className={`h-4 w-4 ${card.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

### Usage Chart Component

```typescript
// apps/admin/src/components/dashboard/usage-chart.tsx

'use client';

import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/admin-api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { formatBytes } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function UsageChart({ className }: { className?: string }) {
  const { data: usageData } = useQuery({
    queryKey: ['admin', 'usage-history'],
    queryFn: () => adminApi.getUsageHistory(30), // Últimos 30 dias
  });

  if (!usageData || usageData.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Uso de Storage</CardTitle>
          <CardDescription>Últimos 30 dias</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Sem dados disponíveis</p>
        </CardContent>
      </Card>
    );
  }

  const chartData = usageData.map((item) => ({
    data: format(new Date(item.data), 'dd/MM', { locale: ptBR }),
    storage: Number(item.totalBytes) / (1024 ** 3), // Converter para GB
  }));

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Uso de Storage</CardTitle>
        <CardDescription>Últimos 30 dias - Total do sistema</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="data" />
            <YAxis 
              tickFormatter={(value) => `${value.toFixed(1)} GB`}
            />
            <Tooltip
              formatter={(value: number) => `${value.toFixed(2)} GB`}
              labelFormatter={(label) => `Data: ${label}`}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="storage" 
              stroke="#8884d8" 
              strokeWidth={2}
              name="Storage (GB)"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
```

## 🏢 Página de Tenants

```typescript
// apps/admin/src/app/(dashboard)/tenants/page.tsx

'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/admin-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatBytes } from '@/lib/utils';
import { Search, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default function TenantsPage() {
  const [search, setSearch] = useState('');

  const { data: tenants, isLoading } = useQuery({
    queryKey: ['admin', 'tenants'],
    queryFn: () => adminApi.getTenants(),
  });

  const filteredTenants = tenants?.filter((t) =>
    t.nomeFantasia.toLowerCase().includes(search.toLowerCase()) ||
    t.cnpj.includes(search)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tenants</h1>
          <p className="text-muted-foreground">
            Gerenciar corretoras e seus limites de storage
          </p>
        </div>
      </div>

      {/* Busca */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou CNPJ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Tabela */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Corretora</TableHead>
              <TableHead>CNPJ</TableHead>
              <TableHead className="text-right">Arquivos</TableHead>
              <TableHead className="text-right">Storage</TableHead>
              <TableHead className="text-right">Uso do Limite</TableHead>
              <TableHead className="text-right">Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : filteredTenants?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  Nenhum tenant encontrado
                </TableCell>
              </TableRow>
            ) : (
              filteredTenants?.map((tenant) => {
                const percentUsed = tenant.usage.percentUsed || 0;
                const status = percentUsed >= 90 ? 'critical' : percentUsed >= 75 ? 'warning' : 'ok';

                return (
                  <TableRow key={tenant.id}>
                    <TableCell className="font-medium">{tenant.nomeFantasia}</TableCell>
                    <TableCell className="font-mono text-sm">{tenant.cnpj}</TableCell>
                    <TableCell className="text-right">
                      {tenant.usage.totalArquivos.toLocaleString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatBytes(BigInt(tenant.usage.totalBytes))}
                    </TableCell>
                    <TableCell className="text-right">
                      {percentUsed.toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={status === 'ok' ? 'default' : status === 'warning' ? 'secondary' : 'destructive'}
                      >
                        {status === 'ok' ? 'OK' : status === 'warning' ? 'Atenção' : 'Crítico'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/tenants/${tenant.id}`}>
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
```

## 💾 Página de Backups

```typescript
// apps/admin/src/app/(dashboard)/backups/page.tsx

'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { adminApi } from '@/lib/admin-api';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatBytes } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Download, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Play,
  Shield
} from 'lucide-react';
import { CreateBackupDialog } from '@/components/backups/create-backup-dialog';
import { RestoreBackupDialog } from '@/components/backups/restore-backup-dialog';
import { useToast } from '@/components/ui/use-toast';

export default function BackupsPage() {
  const [selectedBackup, setSelectedBackup] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: backups, isLoading, refetch } = useQuery({
    queryKey: ['admin', 'backups'],
    queryFn: () => adminApi.getBackups(),
  });

  const verifyMutation = useMutation({
    mutationFn: (backupId: string) => adminApi.verifyBackup(backupId),
    onSuccess: () => {
      toast({
        title: 'Verificação concluída',
        description: 'Integridade do backup verificada com sucesso',
      });
      refetch();
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'concluido':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'falhou':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'em_progresso':
        return <Clock className="h-4 w-4 text-yellow-600 animate-pulse" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Backups</h1>
          <p className="text-muted-foreground">
            Gerenciar backups automáticos e manuais
          </p>
        </div>

        <CreateBackupDialog onSuccess={refetch} />
      </div>

      {/* Tabela */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Corretora</TableHead>
              <TableHead>Iniciado Em</TableHead>
              <TableHead className="text-right">Arquivos</TableHead>
              <TableHead className="text-right">Tamanho</TableHead>
              <TableHead className="text-right">Duração</TableHead>
              <TableHead className="text-center">Verificado</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : backups?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center">
                  Nenhum backup encontrado
                </TableCell>
              </TableRow>
            ) : (
              backups?.map((backup) => {
                const duracao = backup.finalizadoEm && backup.iniciadoEm
                  ? Math.floor(
                      (new Date(backup.finalizadoEm).getTime() -
                        new Date(backup.iniciadoEm).getTime()) /
                        1000
                    )
                  : null;

                return (
                  <TableRow key={backup.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(backup.status)}
                        <span className="capitalize">{backup.status}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={backup.tipo === 'completo' ? 'default' : 'secondary'}>
                        {backup.tipo}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {backup.corretora?.nomeFantasia || backup.corretoraId}
                    </TableCell>
                    <TableCell>
                      {format(new Date(backup.iniciadoEm), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right">
                      {backup.totalArquivos.toLocaleString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatBytes(BigInt(backup.totalBytes))}
                    </TableCell>
                    <TableCell className="text-right">
                      {duracao ? `${duracao}s` : '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      {backup.verificado ? (
                        <Shield className="inline h-4 w-4 text-green-600" />
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => verifyMutation.mutate(backup.id)}
                          disabled={verifyMutation.isPending}
                        >
                          Verificar
                        </Button>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedBackup(backup.id)}
                          disabled={backup.status !== 'concluido'}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog de Restore */}
      {selectedBackup && (
        <RestoreBackupDialog
          backupId={selectedBackup}
          onClose={() => setSelectedBackup(null)}
          onSuccess={() => {
            setSelectedBackup(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}
```

## 📝 Audit Logs Page

```typescript
// apps/admin/src/app/(dashboard)/audit-logs/page.tsx

'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/admin-api';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function AuditLogsPage() {
  const [acao, setAcao] = useState<string>('all');

  const { data: logs, isLoading } = useQuery({
    queryKey: ['admin', 'audit-logs', acao],
    queryFn: () => adminApi.getAuditLogs({ acao: acao !== 'all' ? acao : undefined }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
          <p className="text-muted-foreground">
            Histórico completo de ações administrativas
          </p>
        </div>

        <Select value={acao} onValueChange={setAcao}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por ação" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as ações</SelectItem>
            <SelectItem value="login">Login</SelectItem>
            <SelectItem value="logout">Logout</SelectItem>
            <SelectItem value="criar_backup">Criar Backup</SelectItem>
            <SelectItem value="restaurar_backup">Restaurar Backup</SelectItem>
            <SelectItem value="editar_limites">Editar Limites</SelectItem>
            <SelectItem value="limpar_arquivos">Limpar Arquivos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabela */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data/Hora</TableHead>
              <TableHead>Admin</TableHead>
              <TableHead>Ação</TableHead>
              <TableHead>Detalhes</TableHead>
              <TableHead>IP</TableHead>
              <TableHead>User Agent</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : logs?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  Nenhum log encontrado
                </TableCell>
              </TableRow>
            ) : (
              logs?.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    {format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}
                  </TableCell>
                  <TableCell className="font-medium">
                    {log.admin?.nome || log.adminId}
                  </TableCell>
                  <TableCell>
                    <Badge>{log.acao}</Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {log.detalhes ? JSON.stringify(log.detalhes) : '-'}
                  </TableCell>
                  <TableCell className="font-mono text-sm">{log.ip}</TableCell>
                  <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                    {log.userAgent}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
```

## 🔧 Admin API Client

```typescript
// apps/admin/src/lib/admin-api.ts

import { adminAuth } from './admin-auth';

class AdminApiClient {
  private baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const token = adminAuth.getToken();

    const response = await fetch(`${this.baseUrl}/api/admin${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options?.headers,
      },
    });

    if (response.status === 401) {
      adminAuth.logout();
      window.location.href = '/login';
      throw new Error('Não autenticado');
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro na requisição');
    }

    const data = await response.json();
    return data.data;
  }

  // Dashboard
  async getGlobalStats() {
    return this.request('/dashboard/stats');
  }

  async getUsageHistory(dias: number) {
    return this.request(`/dashboard/usage-history?dias=${dias}`);
  }

  // Tenants
  async getTenants() {
    return this.request('/tenants');
  }

  async getTenant(id: string) {
    return this.request(`/tenants/${id}`);
  }

  async updateTenantLimits(id: string, limits: any) {
    return this.request(`/tenants/${id}/limits`, {
      method: 'PUT',
      body: JSON.stringify(limits),
    });
  }

  // Backups
  async getBackups() {
    return this.request('/backups');
  }

  async getBackup(id: string) {
    return this.request(`/backups/${id}`);
  }

  async createBackup(corretoraId: string, tipo: 'incremental' | 'completo') {
    return this.request('/backups', {
      method: 'POST',
      body: JSON.stringify({ corretoraId, tipo }),
    });
  }

  async verifyBackup(id: string) {
    return this.request(`/backups/${id}/verify`, { method: 'POST' });
  }

  async restoreBackup(id: string, options: any) {
    return this.request(`/backups/${id}/restore`, {
      method: 'POST',
      body: JSON.stringify(options),
    });
  }

  // Audit Logs
  async getAuditLogs(filters?: { acao?: string }) {
    const params = new URLSearchParams(filters as any);
    return this.request(`/audit-logs?${params}`);
  }
}

export const adminApi = new AdminApiClient();
```

## 📝 Checklist de Implementação

- [ ] Criar app Next.js `apps/admin/`
- [ ] Implementar autenticação admin (login, logout, guard)
- [ ] Criar layout com sidebar e topbar
- [ ] Implementar dashboard principal
  - [ ] Cards de estatísticas globais
  - [ ] Gráfico de uso histórico
  - [ ] Lista de alertas
- [ ] Implementar página de tenants
  - [ ] Listagem com busca
  - [ ] Detalhes do tenant
  - [ ] Editar limites
- [ ] Implementar página de backups
  - [ ] Listagem de backups
  - [ ] Criar backup manual
  - [ ] Verificar integridade
  - [ ] Restaurar backup
- [ ] Implementar página de audit logs
  - [ ] Listagem com filtros
  - [ ] Exportar logs
- [ ] Configurar React Query
- [ ] Adicionar testes E2E (Playwright)
- [ ] Deploy separado do app principal

## 🚀 Deploy

```bash
# Build
cd apps/admin
pnpm build

# Deploy no Vercel
vercel --prod
```

## 📝 Próximo Documento

Continue com **[12-WORKERS-JOBS.md](./12-WORKERS-JOBS.md)** para implementar os jobs automáticos.

---

**Navegação**: [← 10. Frontend Anexos](./10-FRONTEND-ANEXOS.md) | [Índice](./00-INDICE.md) | [12. Workers/Jobs →](./12-WORKERS-JOBS.md)
