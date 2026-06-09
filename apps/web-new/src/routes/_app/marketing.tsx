import { createFileRoute } from '@tanstack/react-router';

import { useEffect, useState, useCallback } from 'react';
import { PageGuard } from '@/modules/auth/components/page-guard';
import { useAuthStore } from '@/infra/auth/auth-store';
import {
  Copy,
  ExternalLink,
  Megaphone,
  ShieldCheck,
  Phone,
  MessageSquare,
  Clock,
  Save,
  Users,
  ChevronDown,
  CheckCircle,
  XCircle,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/core/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/core/ui/card';
import { Input } from '@/core/ui/input';
import { Label } from '@/core/ui/label';
import { Badge } from '@/core/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/core/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/core/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/core/ui/table';
import { Separator } from '@/core/ui/separator';
import { api } from '@/infra/http/api';

export const Route = createFileRoute('/_app/marketing')({
  component: MarketingPage,
});


// ─── Types ──────────────────────────────────────────────────────────────────

interface SeguradoraSuporte {
  id: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  telefone: string | null;
  email: string | null;
  telefone24h: string | null;
  whatsapp24h: string | null;
  horarioAtendimento24h: string | null;
}

interface ProdutoRouting {
  id: string;
  nomeProduto: string;
  tipoSeguro: string;
  vendedorPortalId: string | null;
  vendedorPortal: { id: string; nome: string | null } | null;
}

interface Vendedor {
  id: string;
  nome: string | null;
  email: string | null;
}

interface CotacaoSolicitacao {
  id: string;
  status: string;
  mensagem: string | null;
  createdAt: string;
  cliente: {
    nome: string | null;
    razaoSocial: string | null;
    tipoPessoa: string;
    email: string | null;
    celular: string | null;
    telefone: string | null;
  } | null;
  produto: { nomeProduto: string; tipoSeguro: string } | null;
  vendedor: { nome: string | null } | null;
}

// ─── Tab: Portal Link ────────────────────────────────────────────────────────

function PortalLinkTab() {
  const { user } = useAuthStore();
  const subdominio = user?.corretoraSubdominio;
  const appUrl =
    import.meta.env.VITE_APP_URL ||
    (typeof window !== 'undefined' ? window.location.origin : '');
  const portalUrl = subdominio ? `${appUrl}/portal/${subdominio}/login` : null;

  function copiarLink() {
    if (!portalUrl) return;
    navigator.clipboard.writeText(portalUrl);
    toast.success('Link copiado!');
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Link de acesso
          </CardTitle>
          <CardDescription>
            Seus clientes podem entrar com CPF ou CNPJ + data de nascimento — sem precisar
            criar senha ou fazer qualquer cadastro.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {portalUrl ? (
            <>
              <div className="space-y-1.5">
                <Label>URL do portal</Label>
                <div className="flex gap-2">
                  <Input value={portalUrl} readOnly className="font-mono text-sm" />
                  <Button variant="outline" size="icon" onClick={copiarLink} title="Copiar link">
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" asChild title="Abrir em nova aba">
                    <a href={portalUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>
              <div className="rounded-lg border bg-muted/40 p-4 text-sm space-y-2">
                <p className="font-medium">Como funciona?</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• O segurado acessa o link e informa CPF ou CNPJ</li>
                  <li>• Confirma a data de nascimento cadastrada</li>
                  <li>• Visualiza suas apólices ativas, vencimentos e produtos disponíveis</li>
                </ul>
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-dashed p-6 text-center">
              <Megaphone className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                Subdomínio da corretora não disponível. Faça logout e login novamente.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-5">
          <p className="text-sm font-medium">💡 Dica</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Envie este link pelo WhatsApp, e-mail ou adicione ao seu site. Os clientes
            não precisam instalar nada — o portal funciona direto no navegador.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tab: Suporte 24h ────────────────────────────────────────────────────────

function Suporte24hTab() {
  const [seguradoras, setSeguradoras] = useState<SeguradoraSuporte[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, Partial<SeguradoraSuporte>>>({});

  useEffect(() => {
    api.get<SeguradoraSuporte[]>('/marketing/support-insurers')
      .then((data) => {
        setSeguradoras(data);
        const initial: Record<string, Partial<SeguradoraSuporte>> = {};
        data.forEach((s) => {
          initial[s.id] = {
            telefone24h: s.telefone24h ?? '',
            whatsapp24h: s.whatsapp24h ?? '',
            horarioAtendimento24h: s.horarioAtendimento24h ?? '',
          };
        });
        setEdits(initial);
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  function handleChange(id: string, field: keyof SeguradoraSuporte, value: string) {
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  }

  async function handleSave(id: string) {
    setSaving(id);
    try {
      const data = edits[id] ?? {};
      await api.patch(`/marketing/support-insurers/${id}`, {
        telefone24h: data.telefone24h || null,
        whatsapp24h: data.whatsapp24h || null,
        horarioAtendimento24h: data.horarioAtendimento24h || null,
      });
      toast.success('Dados de suporte atualizados!');
      setSeguradoras((prev) =>
        prev.map((s) =>
          s.id === id
            ? { ...s, telefone24h: data.telefone24h || null, whatsapp24h: data.whatsapp24h || null, horarioAtendimento24h: data.horarioAtendimento24h || null }
            : s,
        ),
      );
    } catch {
      toast.error('Erro ao salvar. Tente novamente.');
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-36 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  if (seguradoras.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center">
        <p className="text-muted-foreground">Nenhuma seguradora parceira ativa cadastrada.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Configure os dados de suporte de cada seguradora. Essas informações serão exibidas
        para o segurado na página de detalhes da apólice.
      </p>
      {seguradoras.map((s) => {
        const edit = edits[s.id] ?? {};
        return (
          <Card key={s.id}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">
                {s.nomeFantasia ?? s.razaoSocial}
              </CardTitle>
              {s.nomeFantasia && (
                <p className="text-xs text-muted-foreground">{s.razaoSocial}</p>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-xs">
                    <Phone className="h-3 w-3" />
                    Telefone 24h
                  </Label>
                  <Input
                    value={edit.telefone24h ?? ''}
                    onChange={(e) => handleChange(s.id, 'telefone24h', e.target.value)}
                    placeholder="0800 000 0000"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-xs">
                    <MessageSquare className="h-3 w-3" />
                    WhatsApp 24h
                  </Label>
                  <Input
                    value={edit.whatsapp24h ?? ''}
                    onChange={(e) => handleChange(s.id, 'whatsapp24h', e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="h-8 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-xs">
                  <Clock className="h-3 w-3" />
                  Horário de atendimento
                </Label>
                <Input
                  value={edit.horarioAtendimento24h ?? ''}
                  onChange={(e) => handleChange(s.id, 'horarioAtendimento24h', e.target.value)}
                  placeholder="Ex: 24h / 7 dias por semana"
                  className="h-8 text-sm"
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => handleSave(s.id)}
                disabled={saving === s.id}
              >
                {saving === s.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Salvar
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ─── Tab: Roteamento de Cotações ─────────────────────────────────────────────

function STATUS_BADGE({ status }: { status: string }) {
  if (status === 'PENDENTE') return <Badge variant="secondary">Pendente</Badge>;
  if (status === 'ATENDIDO') return <Badge variant="default" className="bg-green-600">Atendido</Badge>;
  return <Badge variant="destructive">Cancelado</Badge>;
}

function RoteamentoCotacoesTab() {
  const [produtos, setProdutos] = useState<ProdutoRouting[]>([]);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [cotacoes, setCotacoes] = useState<CotacaoSolicitacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingProduto, setSavingProduto] = useState<string | null>(null);
  const [updatingCotacao, setUpdatingCotacao] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('PENDENTE');

  const loadCotacoes = useCallback((status: string) => {
    api.get<CotacaoSolicitacao[]>(`/marketing/quotes?status=${status}`)
      .then(setCotacoes)
      .catch(() => null);
  }, []);

  useEffect(() => {
    Promise.all([
      api.get<ProdutoRouting[]>('/marketing/produtos-routing'),
      api.get<Vendedor[]>('/marketing/sellers'),
      api.get<CotacaoSolicitacao[]>('/marketing/quotes?status=PENDENTE'),
    ])
      .then(([p, v, c]) => {
        setProdutos(p);
        setVendedores(v);
        setCotacoes(c);
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  async function handleVendedorChange(produtoId: string, vendedorId: string) {
    setSavingProduto(produtoId);
    try {
      await api.patch(`/marketing/produtos-routing/${produtoId}`, {
        vendedorPortalId: vendedorId === 'NENHUM' ? null : vendedorId,
      });
      setProdutos((prev) =>
        prev.map((p) => {
          if (p.id !== produtoId) return p;
          const v = vendedores.find((v) => v.id === vendedorId) ?? null;
          return {
            ...p,
            vendedorPortalId: vendedorId === 'NENHUM' ? null : vendedorId,
            vendedorPortal: v ? { id: v.id, nome: v.nome } : null,
          };
        }),
      );
      toast.success('Roteamento atualizado!');
    } catch {
      toast.error('Erro ao salvar. Tente novamente.');
    } finally {
      setSavingProduto(null);
    }
  }

  async function handleStatusCotacao(id: string, status: string) {
    setUpdatingCotacao(id);
    try {
      await api.patch(`/marketing/quotes/${id}`, { status });
      toast.success(status === 'ATENDIDO' ? 'Marcado como atendido!' : 'Cancelado!');
      loadCotacoes(statusFilter);
    } catch {
      toast.error('Erro ao atualizar status.');
    } finally {
      setUpdatingCotacao(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-40 animate-pulse rounded-lg bg-muted" />
        <div className="h-60 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Configurar Destino */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ArrowRight className="h-4 w-4 text-primary" />
            Destino por produto
          </CardTitle>
          <CardDescription>
            Defina qual vendedor recebe automaticamente as solicitações de cotação de cada produto do portal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {produtos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum produto ativo cadastrado.</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="w-[220px]">Vendedor responsável</TableHead>
                    <TableHead className="w-[50px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {produtos.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium text-sm">{p.nomeProduto}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{p.tipoSeguro}</TableCell>
                      <TableCell>
                        <Select
                          value={p.vendedorPortalId ?? 'NENHUM'}
                          onValueChange={(val) => handleVendedorChange(p.id, val)}
                          disabled={savingProduto === p.id}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Sem destino" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NENHUM">
                              <span className="text-muted-foreground">Sem destino</span>
                            </SelectItem>
                            {vendedores.map((v) => (
                              <SelectItem key={v.id} value={v.id}>
                                {v.nome ?? v.email}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {savingProduto === p.id && (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Solicitações recebidas */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              Solicitações recebidas
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Cotações solicitadas pelos segurados no portal
            </p>
          </div>
          <Select
            value={statusFilter}
            onValueChange={(v) => { setStatusFilter(v); loadCotacoes(v); }}
          >
            <SelectTrigger className="h-8 w-[140px] text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PENDENTE">Pendentes</SelectItem>
              <SelectItem value="ATENDIDO">Atendidas</SelectItem>
              <SelectItem value="CANCELADO">Canceladas</SelectItem>
              <SelectItem value="TODAS">Todas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {cotacoes.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Nenhuma solicitação {statusFilter !== 'TODAS' ? statusFilter.toLowerCase() : ''}.
            </p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Mensagem</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[120px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cotacoes.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-sm">
                      <p className="font-medium">
                        {c.cliente?.nome ?? c.cliente?.razaoSocial ?? '—'}
                      </p>
                      {(c.cliente?.celular || c.cliente?.telefone) && (
                        <p className="text-xs text-muted-foreground">
                          {c.cliente.celular ?? c.cliente.telefone}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {c.produto ? (
                        <>
                          <p>{c.produto.nomeProduto}</p>
                          <p className="text-xs text-muted-foreground">{c.produto.tipoSeguro}</p>
                        </>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.vendedor?.nome ?? <span className="italic">Sem destino</span>}
                    </TableCell>
                    <TableCell className="max-w-[180px]">
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {c.mensagem ?? '—'}
                      </p>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(c.createdAt).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <STATUS_BADGE status={c.status} />
                    </TableCell>
                    <TableCell>
                      {c.status === 'PENDENTE' && (
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-green-600 hover:text-green-700"
                            title="Marcar como atendido"
                            disabled={updatingCotacao === c.id}
                            onClick={() => handleStatusCotacao(c.id, 'ATENDIDO')}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            title="Cancelar"
                            disabled={updatingCotacao === c.id}
                            onClick={() => handleStatusCotacao(c.id, 'CANCELADO')}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

function MarketingContent() {
  return (
    <div className="space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Portal do Segurado</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gerencie o link de acesso, suporte das seguradoras e solicitações de cotação.
        </p>
      </div>

      <Tabs defaultValue="portal">
        <TabsList>
          <TabsTrigger value="portal">Link do Portal</TabsTrigger>
          <TabsTrigger value="suporte">Suporte 24h</TabsTrigger>
          <TabsTrigger value="cotacoes">Cotações</TabsTrigger>
        </TabsList>

        <TabsContent value="portal" className="mt-4">
          <PortalLinkTab />
        </TabsContent>

        <TabsContent value="suporte" className="mt-4">
          <Suporte24hTab />
        </TabsContent>

        <TabsContent value="cotacoes" className="mt-4">
          <RoteamentoCotacoesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MarketingPage() {
  return (
    <PageGuard permission="marketing:acessar">
      <MarketingContent />
    </PageGuard>
  );
}
