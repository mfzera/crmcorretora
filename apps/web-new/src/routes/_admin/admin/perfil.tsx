import { createFileRoute } from '@tanstack/react-router';

import { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AdminGuard } from '@/modules/admin/components/admin-guard';
import { adminApi } from '@/infra/http/admin-api';
import { adminAuth } from '@/infra/auth/admin-auth';
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
import { Separator } from '@/core/ui/separator';
import { Badge } from '@/core/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/core/ui/avatar';
import { toast } from 'sonner';
import { Camera, KeyRound, ShieldCheck, ShieldOff, Trash2 } from 'lucide-react';
import { PageHeader } from '@/modules/admin/components/page-header';

export const Route = createFileRoute('/_admin/admin/perfil')({
  component: AdminPerfilPage,
});


function initials(name?: string) {
  if (!name) return 'A';
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
}

function AdminPerfilPage() {
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<ReturnType<typeof adminAuth.getUser>>(null);
  const [nome, setNome] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const u = adminAuth.getUser();
    setUser(u);
    setNome(u?.nome || '');
    setAvatarUrl(u?.avatarUrl ?? null);
    setMounted(true);
  }, []);
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');

  // 2FA state
  const [twoFaStep, setTwoFaStep] = useState<'idle' | 'setup' | 'enable' | 'disable'>('idle');
  const [twoFaQrCode, setTwoFaQrCode] = useState('');
  const [twoFaSecret, setTwoFaSecret] = useState('');
  const [twoFaCode, setTwoFaCode] = useState('');

  const queryClient = useQueryClient();

  const { data: twoFaStatus } = useQuery({
    queryKey: ['admin-2fa-status'],
    queryFn: () => adminApi.get2faStatus(),
    enabled: mounted,
  });

  const avatarUploadMutation = useMutation({
    mutationFn: (file: File) => adminApi.uploadAdminAvatar(file),
    onSuccess: (data) => {
      setAvatarUrl(data.avatarUrl);
      const current = adminAuth.getUser();
      if (current) {
        localStorage.setItem('admin_user', JSON.stringify({ ...current, avatarUrl: data.avatarUrl }));
        window.dispatchEvent(new Event('admin-user-updated'));
      }
      toast.success('Foto atualizada com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao enviar foto', { description: error.message });
    },
  });

  const avatarDeleteMutation = useMutation({
    mutationFn: () => adminApi.deleteAdminAvatar(),
    onSuccess: () => {
      setAvatarUrl(null);
      const current = adminAuth.getUser();
      if (current) {
        localStorage.setItem('admin_user', JSON.stringify({ ...current, avatarUrl: null }));
        window.dispatchEvent(new Event('admin-user-updated'));
      }
      toast.success('Foto removida');
    },
    onError: (error: Error) => {
      toast.error('Erro ao remover foto', { description: error.message });
    },
  });

  const nomeMutation = useMutation({
    mutationFn: () => adminApi.updateProfile({ nome }),
    onSuccess: (data) => {
      // Atualiza o user no localStorage para refletir no sidebar
      const current = adminAuth.getUser();
      if (current) {
        localStorage.setItem(
          'admin_user',
          JSON.stringify({ ...current, nome: data.admin.nome }),
        );
      }
      toast.success('Nome atualizado com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar nome', { description: error.message });
    },
  });

  const senhaMutation = useMutation({
    mutationFn: () =>
      adminApi.updateProfile({ senhaAtual, novaSenha }),
    onSuccess: () => {
      toast.success('Senha atualizada com sucesso');
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmarSenha('');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar senha', { description: error.message });
    },
  });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    avatarUploadMutation.mutate(file);
    e.target.value = '';
  };

  const handleNomeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;
    nomeMutation.mutate();
  };

  const handleSenhaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (novaSenha !== confirmarSenha) {
      toast.error('As senhas não coincidem');
      return;
    }
    senhaMutation.mutate();
  };

  const handleSetup2fa = async () => {
    try {
      const data = await adminApi.setup2fa();
      setTwoFaQrCode(data.qrCode);
      setTwoFaSecret(data.secret);
      setTwoFaStep('enable');
    } catch (error) {
      toast.error('Erro ao configurar 2FA', {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const enable2faMutation = useMutation({
    mutationFn: () => adminApi.enable2fa(twoFaCode),
    onSuccess: () => {
      toast.success('2FA ativado com sucesso');
      setTwoFaStep('idle');
      setTwoFaCode('');
      setTwoFaQrCode('');
      setTwoFaSecret('');
      queryClient.setQueryData(['admin-2fa-status'], { enabled: true });
    },
    onError: (error: Error) => {
      toast.error('Código inválido', { description: error.message });
      setTwoFaCode('');
    },
  });

  const disable2faMutation = useMutation({
    mutationFn: () => adminApi.disable2fa(twoFaCode),
    onSuccess: () => {
      toast.success('2FA desativado');
      setTwoFaStep('idle');
      setTwoFaCode('');
      queryClient.setQueryData(['admin-2fa-status'], { enabled: false });
    },
    onError: (error: Error) => {
      toast.error('Código inválido', { description: error.message });
      setTwoFaCode('');
    },
  });

  if (!mounted) return null;

  return (
    <AdminGuard>
      <div className="max-w-3xl space-y-10">
        <PageHeader
          eyebrow="Conta administrativa"
          title="Meu perfil"
          description="Gerencie suas informações pessoais e senha de acesso."
        />

        {/* Info fixa */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informações da Conta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Email</span>
              <span className="font-mono">{user?.email}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Permissões</span>
              <span>{user?.permissoes?.length || 0} permissões ativas</span>
            </div>
          </CardContent>
        </Card>

        {/* Foto de perfil */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Foto de Perfil
            </CardTitle>
            <CardDescription>JPG, PNG ou WebP — máximo 2MB</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="relative">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={avatarUrl ?? undefined} alt={user?.nome} />
                  <AvatarFallback className="bg-primary text-xl font-semibold text-primary-foreground">
                    {initials(user?.nome)}
                  </AvatarFallback>
                </Avatar>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarUploadMutation.isPending}
                  className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground shadow transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  <Camera className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarUploadMutation.isPending}
                >
                  {avatarUploadMutation.isPending ? 'Enviando...' : 'Alterar foto'}
                </Button>
                {avatarUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => avatarDeleteMutation.mutate()}
                    disabled={avatarDeleteMutation.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                    {avatarDeleteMutation.isPending ? 'Removendo...' : 'Remover foto'}
                  </Button>
                )}
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </CardContent>
        </Card>

        {/* Alterar nome */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nome de Exibição</CardTitle>
            <CardDescription>
              Este nome aparece no sidebar e nos changelogs publicados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleNomeSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome</Label>
                <Input
                  id="nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Seu nome completo"
                  required
                  minLength={3}
                />
              </div>
              <Button type="submit" disabled={nomeMutation.isPending}>
                {nomeMutation.isPending ? 'Salvando...' : 'Salvar Nome'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Alterar senha */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <KeyRound className="h-4 w-4" />
              Alterar Senha
            </CardTitle>
            <CardDescription>
              Mínimo de 8 caracteres
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSenhaSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="senhaAtual">Senha Atual</Label>
                <Input
                  id="senhaAtual"
                  type="password"
                  value={senhaAtual}
                  onChange={(e) => setSenhaAtual(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="novaSenha">Nova Senha</Label>
                <Input
                  id="novaSenha"
                  type="password"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmarSenha">Confirmar Nova Senha</Label>
                <Input
                  id="confirmarSenha"
                  type="password"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              <Button type="submit" disabled={senhaMutation.isPending}>
                {senhaMutation.isPending ? 'Salvando...' : 'Alterar Senha'}
              </Button>
            </form>
          </CardContent>
        </Card>
        {/* 2FA */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Autenticação em Dois Fatores (2FA)
              {twoFaStatus?.enabled ? (
                <Badge variant="default" className="ml-auto">Ativo</Badge>
              ) : (
                <Badge variant="secondary" className="ml-auto">Inativo</Badge>
              )}
            </CardTitle>
            <CardDescription>
              Use um app autenticador (Google Authenticator, Authy) para maior segurança
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {twoFaStep === 'idle' && (
              <>
                {twoFaStatus?.enabled ? (
                  <Button
                    variant="destructive"
                    onClick={() => setTwoFaStep('disable')}
                  >
                    <ShieldOff className="h-4 w-4 mr-2" />
                    Desativar 2FA
                  </Button>
                ) : (
                  <Button onClick={handleSetup2fa}>
                    <ShieldCheck className="h-4 w-4 mr-2" />
                    Ativar 2FA
                  </Button>
                )}
              </>
            )}

            {twoFaStep === 'enable' && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Escaneie o QR code com seu app autenticador e insira o código gerado para confirmar.
                </p>
                {twoFaQrCode && (
                  <div className="flex justify-center">
                    <img src={twoFaQrCode} alt="QR Code 2FA" className="rounded border p-2 bg-white" />
                  </div>
                )}
                {twoFaSecret && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Ou insira o código manualmente:</p>
                    <code className="block text-xs bg-muted px-2 py-1 rounded break-all">{twoFaSecret}</code>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Código de verificação</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    value={twoFaCode}
                    onChange={(e) => setTwoFaCode(e.target.value.replace(/\D/g, ''))}
                    className="text-center tracking-widest text-lg"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => enable2faMutation.mutate()}
                    disabled={twoFaCode.length !== 6 || enable2faMutation.isPending}
                  >
                    {enable2faMutation.isPending ? 'Verificando...' : 'Confirmar e ativar'}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setTwoFaStep('idle');
                      setTwoFaCode('');
                      setTwoFaQrCode('');
                      setTwoFaSecret('');
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            {twoFaStep === 'disable' && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Insira o código do seu app autenticador para desativar o 2FA.
                </p>
                <div className="space-y-2">
                  <Label>Código de verificação</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    value={twoFaCode}
                    onChange={(e) => setTwoFaCode(e.target.value.replace(/\D/g, ''))}
                    className="text-center tracking-widest text-lg"
                    autoFocus
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    onClick={() => disable2faMutation.mutate()}
                    disabled={twoFaCode.length !== 6 || disable2faMutation.isPending}
                  >
                    {disable2faMutation.isPending ? 'Desativando...' : 'Desativar 2FA'}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setTwoFaStep('idle');
                      setTwoFaCode('');
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminGuard>
  );
}
