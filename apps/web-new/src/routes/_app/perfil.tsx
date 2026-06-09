import { createFileRoute } from '@tanstack/react-router';

import { useState, useRef, useEffect, lazy, Suspense } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  User,
  Mail,
  Briefcase,
  Shield,
  Key,
  Save,
  Loader2,
  Camera,
  Trash2,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/core/ui/card';
import { Button } from '@/core/ui/button';
import { Input } from '@/core/ui/input';
import { Label } from '@/core/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/core/ui/avatar';
import { Badge } from '@/core/ui/badge';
import { Separator } from '@/core/ui/separator';
import { useAuthStore } from '@/infra/auth/auth-store';
import { toast } from 'sonner';
import { api } from '@/infra/http/api';
import {
  useUploadAvatar,
  useRemoverAvatar,
  useUpdateUser,
} from '@/modules/usuarios/http';
const AvatarCropDialog = lazy(() =>
  import('@/core/ui/avatar-crop-dialog').then((m) => ({ default: m.AvatarCropDialog })),
);
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/core/ui/tabs';
import { useGoogleCalendarStatus, useDisconnectGoogleCalendar, useSyncToGoogle } from '@/modules/calendario/http';
import { Calendar, RefreshCw, Unlink } from 'lucide-react';

export const Route = createFileRoute('/_app/perfil')({
  validateSearch: (search): { tab: string | undefined; google: string | undefined } => ({
    tab: search.tab as string | undefined,
    google: search.google as string | undefined,
  }),
  component: PerfilPage,
});


function PerfilPage() {
  const { user, updateUser } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadAvatarMutation = useUploadAvatar();
  const removerAvatarMutation = useRemoverAvatar();
  const atualizarUsuarioMutation = useUpdateUser();
  const { data: googleStatus } = useGoogleCalendarStatus();
  const disconnectGoogle = useDisconnectGoogleCalendar();
  const syncToGoogle = useSyncToGoogle();
  const { google: googleParam, tab: tabParam } = Route.useSearch();
  const navigate = useNavigate();

  useEffect(() => {
    if (googleParam === 'connected') {
      toast.success('Google Calendar conectado com sucesso!');
      navigate({ to: '/perfil', search: { tab: 'conexoes', google: undefined }, replace: true });
    } else if (googleParam === 'error') {
      toast.error('Erro ao conectar Google Calendar. Tente novamente.');
      navigate({ to: '/perfil', search: { tab: 'conexoes', google: undefined }, replace: true });
    }
  }, [googleParam, navigate]);

  const [formData, setFormData] = useState({
    nome: user?.nome || '',
    email: user?.email || '',
  });

  const [senhaData, setSenhaData] = useState({
    senhaAtual: '',
    novaSenha: '',
    confirmarSenha: '',
  });

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 10MB');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Open crop dialog instead of uploading directly
    const objectUrl = URL.createObjectURL(file);
    setCropImageSrc(objectUrl);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCropConfirm = async (croppedFile: File) => {
    const previewObjectUrl = URL.createObjectURL(croppedFile);
    setPreviewUrl(previewObjectUrl);
    setCropImageSrc(null);

    try {
      const result = await uploadAvatarMutation.mutateAsync({
        id: user!.id,
        file: croppedFile,
      });

      if (user && result?.avatarUrl) {
        updateUser({ ...user, avatarUrl: result.avatarUrl });
      }

      toast.success('Foto de perfil atualizada com sucesso');
      URL.revokeObjectURL(previewObjectUrl);
      setPreviewUrl(null);
    } catch (error: any) {
      URL.revokeObjectURL(previewObjectUrl);
      setPreviewUrl(null);
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Não foi possível atualizar a foto';
      toast.error(message);
    }
  };

  const handleCropCancel = () => {
    if (cropImageSrc) URL.revokeObjectURL(cropImageSrc);
    setCropImageSrc(null);
  };

  const handleRemoveAvatar = async () => {
    if (!user?.avatarUrl && !previewUrl) return;

    try {
      await removerAvatarMutation.mutateAsync(user!.id);

      // Update auth store to remove avatar URL
      if (user) {
        updateUser({ ...user, avatarUrl: null });
      }

      // Clear preview
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }

      toast.success('Foto de perfil removida com sucesso');
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Não foi possível remover a foto';
      toast.error(message);
    }
  };

  const handleUpdateProfile = async () => {
    if (!user) return;

    if (!formData.nome.trim()) {
      toast.error('O nome não pode estar vazio');
      return;
    }

    setIsLoading(true);
    try {
      const result = await atualizarUsuarioMutation.mutateAsync({
        id: user.id,
        data: {
          nome: formData.nome.trim(),
        },
      });

      // Update auth store with new data
      if (result) {
        updateUser({ ...user, nome: result.nome });
      }

      toast.success('Perfil atualizado com sucesso');
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Não foi possível atualizar o perfil';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!senhaData.senhaAtual) {
      toast.error('Informe sua senha atual');
      return;
    }

    if (senhaData.novaSenha !== senhaData.confirmarSenha) {
      toast.error('A nova senha e a confirmação devem ser iguais');
      return;
    }

    if (senhaData.novaSenha.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/auth/change-password', {
        senhaAtual: senhaData.senhaAtual,
        novaSenha: senhaData.novaSenha,
      });

      toast.success('Senha alterada com sucesso');

      setSenhaData({
        senhaAtual: '',
        novaSenha: '',
        confirmarSenha: '',
      });
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Não foi possível alterar a senha';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Carregando perfil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6 p-3 sm:p-6 md:p-8">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">
          Meu Perfil
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Gerencie suas informações pessoais e configurações
        </p>
      </div>

      <Tabs defaultValue={tabParam ?? 'perfil'}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="perfil" className="flex-1 sm:flex-none">Perfil</TabsTrigger>
          <TabsTrigger value="conexoes" className="flex-1 sm:flex-none">Conexões</TabsTrigger>
        </TabsList>

        <TabsContent value="perfil" className="mt-6 flex flex-col gap-6">

      {/* Avatar e Informações Básicas */}
      <Card>
        <CardHeader>
          <CardTitle>Informações do Usuário</CardTitle>
          <CardDescription>
            Seus dados básicos e função no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:gap-6 sm:items-start">
            <div className="relative group self-center sm:self-auto">
              <Avatar className="h-24 w-24">
                {(previewUrl || user.avatarUrl) && (
                  <AvatarImage
                    src={previewUrl || user.avatarUrl || ''}
                    alt={user.nome}
                  />
                )}
                <AvatarFallback className="text-2xl">
                  {getInitials(user.nome)}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 rounded-full opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-white hover:text-white hover:bg-white/20"
                  onClick={handleAvatarClick}
                  disabled={uploadAvatarMutation.isPending}
                  title="Alterar foto"
                >
                  {uploadAvatarMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </Button>
                {(user.avatarUrl || previewUrl) && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-white hover:text-white hover:bg-white/20"
                    onClick={handleRemoveAvatar}
                    disabled={removerAvatarMutation.isPending}
                    title="Remover foto"
                  >
                    {removerAvatarMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            <div className="flex-1 min-w-0 space-y-4 text-center sm:text-left">
              <div className="min-w-0">
                <h3 className="text-lg sm:text-xl font-semibold truncate">{user.nome}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground break-all sm:truncate">{user.email}</p>
              </div>

              <div className="flex flex-wrap justify-center sm:justify-start gap-1.5">
                {user.isAdmin && (
                  <Badge variant="destructive" className="gap-1">
                    <Shield className="h-3 w-3" />
                    Administrador
                  </Badge>
                )}
                {user.isGestor && (
                  <Badge variant="default" className="gap-1">
                    <Briefcase className="h-3 w-3" />
                    Gestor
                  </Badge>
                )}
                {user.isVendedor && (
                  <Badge variant="secondary" className="gap-1">
                    <User className="h-3 w-3" />
                    Vendedor
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Editar Perfil */}
      <Card>
        <CardHeader>
          <CardTitle>Editar Perfil</CardTitle>
          <CardDescription>Atualize suas informações pessoais</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome Completo</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) =>
                  setFormData({ ...formData, nome: e.target.value })
                }
                className="pl-9"
                placeholder="Seu nome completo"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={formData.email}
                className="pl-9 bg-muted"
                placeholder="seu.email@exemplo.com"
                disabled
                readOnly
              />
            </div>
            <p className="text-xs text-muted-foreground">
              O e-mail não pode ser alterado. Entre em contato com um
              administrador se necessário.
            </p>
          </div>

          <Button
            onClick={handleUpdateProfile}
            disabled={
              isLoading ||
              atualizarUsuarioMutation.isPending ||
              !formData.nome.trim() ||
              formData.nome === user?.nome
            }
            className="w-full sm:w-auto"
          >
            {isLoading || atualizarUsuarioMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar Alterações
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Alterar Senha */}
      <Card>
        <CardHeader>
          <CardTitle>Alterar Senha</CardTitle>
          <CardDescription>
            Mantenha sua conta segura alterando sua senha regularmente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="senhaAtual">Senha Atual</Label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="senhaAtual"
                type="password"
                value={senhaData.senhaAtual}
                onChange={(e) =>
                  setSenhaData({ ...senhaData, senhaAtual: e.target.value })
                }
                className="pl-9"
                placeholder="Digite sua senha atual"
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="novaSenha">Nova Senha</Label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="novaSenha"
                type="password"
                value={senhaData.novaSenha}
                onChange={(e) =>
                  setSenhaData({ ...senhaData, novaSenha: e.target.value })
                }
                className="pl-9"
                placeholder="Digite sua nova senha"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmarSenha">Confirmar Nova Senha</Label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="confirmarSenha"
                type="password"
                value={senhaData.confirmarSenha}
                onChange={(e) =>
                  setSenhaData({ ...senhaData, confirmarSenha: e.target.value })
                }
                className="pl-9"
                placeholder="Confirme sua nova senha"
              />
            </div>
          </div>

          <Button
            onClick={handleUpdatePassword}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Atualizando...
              </>
            ) : (
              <>
                <Key className="mr-2 h-4 w-4" />
                Atualizar Senha
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Avatar Crop Dialog */}
      {cropImageSrc && (
        <Suspense fallback={null}>
          <AvatarCropDialog
            imageSrc={cropImageSrc}
            onConfirm={handleCropConfirm}
            onCancel={handleCropCancel}
          />
        </Suspense>
      )}

      {/* Permissões */}
      <Card>
        <CardHeader>
          <CardTitle>Permissões</CardTitle>
          <CardDescription>Suas permissões no sistema</CardDescription>
        </CardHeader>
        <CardContent>
          {user.permissoes && user.permissoes.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {user.permissoes.map((permissao) => (
                <Badge key={permissao} variant="outline" className="text-xs max-w-full break-all">
                  {permissao}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhuma permissão específica atribuída.
            </p>
          )}
        </CardContent>
      </Card>

        </TabsContent>

        <TabsContent value="conexoes" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="size-5" />
                Google Calendar
              </CardTitle>
              <CardDescription>
                Conecte seu Google Calendar para sincronizar eventos e tarefas.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`size-2.5 rounded-full shrink-0 ${googleStatus?.conectado ? 'bg-green-500' : 'bg-muted-foreground/40'}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {googleStatus?.conectado ? 'Conectado' : 'Não conectado'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {googleStatus?.conectado
                        ? 'Seus eventos e tarefas estão sendo sincronizados'
                        : 'Conecte para sincronizar com o Google Calendar e Google Tasks'}
                    </p>
                  </div>
                </div>

                {googleStatus?.conectado ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50 w-full sm:w-auto"
                    onClick={() => disconnectGoogle.mutate()}
                    disabled={disconnectGoogle.isPending}
                  >
                    <Unlink className="size-4" />
                    Desconectar
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="gap-1.5 w-full sm:w-auto"
                    onClick={async () => {
                      try {
                        const { url } = await import('@/infra/http/api').then(m =>
                          m.api.get<{ url: string }>('/auth/google-calendar/connect-url')
                        );
                        window.location.href = url;
                      } catch {
                        toast.error('Erro ao iniciar conexão com Google Calendar.');
                      }
                    }}
                  >
                    <Calendar className="size-4" />
                    Conectar
                  </Button>
                )}
              </div>

              {googleStatus?.conectado && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border p-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Sincronizar tarefas</p>
                    <p className="text-xs text-muted-foreground">
                      Envia suas tarefas futuras para o Google Tasks e Google Calendar
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 w-full sm:w-auto"
                    disabled={syncToGoogle.isPending}
                    onClick={() =>
                      syncToGoogle.mutate(undefined, {
                        onSuccess: (res) => {
                          toast.success(
                            `${res.syncedTarefas} tarefa${res.syncedTarefas !== 1 ? 's' : ''} enviada${res.syncedTarefas !== 1 ? 's' : ''} para o Google`,
                          );
                        },
                        onError: () => toast.error('Erro ao sincronizar com Google.'),
                      })
                    }
                  >
                    <RefreshCw className={`size-4 ${syncToGoogle.isPending ? 'animate-spin' : ''}`} />
                    {syncToGoogle.isPending ? 'Sincronizando...' : 'Sincronizar agora'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
