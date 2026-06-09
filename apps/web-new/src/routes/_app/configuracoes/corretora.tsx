import { createFileRoute } from '@tanstack/react-router';

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Building2, ImageIcon, Loader2, Trash2, Upload } from 'lucide-react';
import { useAuthStore } from '@/infra/auth/auth-store';
import {
  useCorretoraConfig,
  useCorretoraHistorico,
  useRemoveCorretoraLogo,
  useUpdateCorretora,
  useUploadCorretoraLogo,
  type UpdateCorretoraInput,
} from '@/modules/corretora-config/http';
import { Button } from '@/core/ui/button';
import { Input } from '@/core/ui/input';
import { Label } from '@/core/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/core/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/core/ui/tabs';
import { Skeleton } from '@/core/ui/skeleton';
import { Separator } from '@/core/ui/separator';
import { Badge } from '@/core/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/core/ui/alert-dialog';
import { toast } from 'sonner';

export const Route = createFileRoute('/_app/configuracoes/corretora')({
  component: CorretoraConfigPage,
});


const ACCEPTED_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_LOGO_BYTES = 2 * 1024 * 1024;

const ACAO_LABELS: Record<string, string> = {
  corretora_atualizada: 'Dados atualizados',
  logo_atualizado: 'Logo atualizado',
  logo_removido: 'Logo removido',
};

const FIELD_LABELS: Record<string, string> = {
  nomeFantasia: 'Nome fantasia',
  razaoSocial: 'Razão social',
  emailContato: 'E-mail de contato',
  telefone: 'Telefone',
  cep: 'CEP',
  logradouro: 'Logradouro',
  numero: 'Número',
  complemento: 'Complemento',
  bairro: 'Bairro',
  cidade: 'Cidade',
  uf: 'UF',
  logoUrl: 'Logo',
};

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function fieldLabel(key: string) {
  return FIELD_LABELS[key] ?? key;
}

function renderValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'string') {
    if (value.startsWith('http')) return 'arquivo enviado';
    if (value.includes('/branding/')) return 'arquivo enviado';
    return value;
  }
  return String(value);
}

function CorretoraConfigPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  useEffect(() => {
    if (user && !user.isAdmin) {
      navigate({ to: '/sem-permissao', search: { permissao: undefined as unknown as string }, replace: true });
    }
  }, [user, navigate]);

  const { data: corretora, isLoading } = useCorretoraConfig();
  const { data: historico = [], isLoading: historicoLoading } =
    useCorretoraHistorico(50);
  const updateMutation = useUpdateCorretora();
  const uploadLogo = useUploadCorretoraLogo();
  const removeLogo = useRemoveCorretoraLogo();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [form, setForm] = useState<UpdateCorretoraInput>({});

  useEffect(() => {
    if (corretora) {
      setForm({
        nomeFantasia: corretora.nomeFantasia ?? '',
        razaoSocial: corretora.razaoSocial,
        emailContato: corretora.emailContato ?? '',
        telefone: corretora.telefone ?? '',
        cep: corretora.cep ?? '',
        logradouro: corretora.logradouro ?? '',
        numero: corretora.numero ?? '',
        complemento: corretora.complemento ?? '',
        bairro: corretora.bairro ?? '',
        cidade: corretora.cidade ?? '',
        uf: corretora.uf ?? '',
      });
    }
  }, [corretora]);

  if (!user || !user.isAdmin) {
    return (
      <div className="space-y-4 p-4 md:p-8">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const handleField =
    (key: keyof UpdateCorretoraInput) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((f) => ({ ...f, [key]: e.target.value }));
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!corretora) return;

    const payload: UpdateCorretoraInput = {};
    (Object.keys(form) as (keyof UpdateCorretoraInput)[]).forEach((key) => {
      const next = (form[key] ?? '') as string;
      const current = ((corretora as any)[key] ?? '') as string;
      if (next.trim() !== current.trim()) {
        // Strings vazias viram null para campos opcionais
        const optional = key !== 'razaoSocial' && key !== 'nomeFantasia';
        if (optional && next.trim() === '') {
          (payload as any)[key] = null;
        } else {
          (payload as any)[key] = next.trim();
        }
      }
    });

    if (Object.keys(payload).length === 0) {
      toast.info('Nenhuma alteração para salvar');
      return;
    }

    await updateMutation.mutateAsync(payload);
  };

  const handleLogoSelected = async (file: File | null) => {
    if (!file) return;
    if (!ACCEPTED_LOGO_TYPES.includes(file.type)) {
      toast.error('Formato inválido. Use PNG, JPEG ou WebP.');
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      toast.error('Arquivo maior que 2MB.');
      return;
    }
    await uploadLogo.mutateAsync(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-6 p-4 md:p-8">
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <Building2 className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold tracking-tight">
            Configurações da Corretora
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Atualize os dados cadastrais e o logo exibido no sistema.
        </p>
      </header>

      <Tabs defaultValue="dados" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dados">Dados</TabsTrigger>
          <TabsTrigger value="logo">Logo</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        {/* DADOS */}
        <TabsContent value="dados" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Identificação</CardTitle>
              <CardDescription>
                CNPJ e subdomínio são fixos e não podem ser alterados aqui.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading || !corretora ? (
                <div className="space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>CNPJ</Label>
                      <Input value={corretora.cnpj} disabled />
                    </div>
                    <div className="space-y-2">
                      <Label>Subdomínio</Label>
                      <Input value={corretora.subdominio} disabled />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="razaoSocial">Razão Social *</Label>
                      <Input
                        id="razaoSocial"
                        value={form.razaoSocial ?? ''}
                        onChange={handleField('razaoSocial')}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nomeFantasia">Nome Fantasia</Label>
                      <Input
                        id="nomeFantasia"
                        value={form.nomeFantasia ?? ''}
                        onChange={handleField('nomeFantasia')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="emailContato">E-mail de contato</Label>
                      <Input
                        id="emailContato"
                        type="email"
                        value={form.emailContato ?? ''}
                        onChange={handleField('emailContato')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="telefone">Telefone</Label>
                      <Input
                        id="telefone"
                        value={form.telefone ?? ''}
                        onChange={handleField('telefone')}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="mb-3 text-sm font-medium text-muted-foreground">
                      Endereço
                    </h3>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="cep">CEP</Label>
                        <Input
                          id="cep"
                          value={form.cep ?? ''}
                          onChange={handleField('cep')}
                          maxLength={8}
                          placeholder="00000000"
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="logradouro">Logradouro</Label>
                        <Input
                          id="logradouro"
                          value={form.logradouro ?? ''}
                          onChange={handleField('logradouro')}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="numero">Número</Label>
                        <Input
                          id="numero"
                          value={form.numero ?? ''}
                          onChange={handleField('numero')}
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="complemento">Complemento</Label>
                        <Input
                          id="complemento"
                          value={form.complemento ?? ''}
                          onChange={handleField('complemento')}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bairro">Bairro</Label>
                        <Input
                          id="bairro"
                          value={form.bairro ?? ''}
                          onChange={handleField('bairro')}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cidade">Cidade</Label>
                        <Input
                          id="cidade"
                          value={form.cidade ?? ''}
                          onChange={handleField('cidade')}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="uf">UF</Label>
                        <Input
                          id="uf"
                          value={form.uf ?? ''}
                          onChange={handleField('uf')}
                          maxLength={2}
                          className="uppercase"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={updateMutation.isPending}
                    >
                      {updateMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Salvar alterações
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* LOGO */}
        <TabsContent value="logo" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Logo da corretora</CardTitle>
              <CardDescription>
                PNG, JPEG ou WebP. Máximo 2MB. O logo é exibido em telas de
                login, troca de corretora e em documentos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-6">
                <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-muted bg-muted/30">
                  {corretora?.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={corretora.logoUrl}
                      alt="Logo da corretora"
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <ImageIcon className="h-10 w-10 text-muted-foreground" />
                  )}
                </div>
                <div className="space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPTED_LOGO_TYPES.join(',')}
                    className="hidden"
                    onChange={(e) =>
                      handleLogoSelected(e.target.files?.[0] ?? null)
                    }
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadLogo.isPending}
                    >
                      {uploadLogo.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="mr-2 h-4 w-4" />
                      )}
                      {corretora?.logoUrl ? 'Trocar logo' : 'Enviar logo'}
                    </Button>

                    {corretora?.logoUrl && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            disabled={removeLogo.isPending}
                          >
                            {removeLogo.isPending ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="mr-2 h-4 w-4" />
                            )}
                            Remover
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Remover logo da corretora?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              O logo voltará a ser exibido como ícone padrão até
                              que um novo seja enviado.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => removeLogo.mutate()}
                            >
                              Remover
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Recomendamos imagem quadrada com fundo transparente.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* HISTÓRICO */}
        <TabsContent value="historico" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de alterações</CardTitle>
              <CardDescription>
                Últimas modificações nos dados da corretora.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {historicoLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : historico.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma alteração registrada ainda.
                </p>
              ) : (
                <ul className="divide-y">
                  {historico.map((item) => (
                    <li key={item.id} className="py-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">
                            {ACAO_LABELS[item.acao] ?? item.acao}
                          </Badge>
                          <span className="text-sm font-medium">
                            {item.usuarioNome ??
                              item.usuarioEmail ??
                              'usuário desconhecido'}
                          </span>
                        </div>
                        <time className="text-xs text-muted-foreground">
                          {formatDate(item.createdAt)}
                        </time>
                      </div>
                      {item.dadosNovos && Object.keys(item.dadosNovos).length > 0 && (
                        <div className="mt-2 space-y-1 text-xs">
                          {Object.entries(item.dadosNovos).map(([key, novo]) => {
                            const antes = (item.dadosAnteriores as any)?.[key];
                            return (
                              <div
                                key={key}
                                className="grid grid-cols-1 gap-1 text-muted-foreground md:grid-cols-[140px_1fr_1fr]"
                              >
                                <span className="font-medium text-foreground">
                                  {fieldLabel(key)}
                                </span>
                                <span className="line-through opacity-70">
                                  {renderValue(antes)}
                                </span>
                                <span className="text-foreground">
                                  {renderValue(novo)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
