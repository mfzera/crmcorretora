import { createFileRoute, Link } from '@tanstack/react-router';
import { useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Sun,
  Moon,
} from 'lucide-react';
import { toast } from 'sonner';
import { useThemeStore } from '@/infra/providers/theme-provider';

import { Button } from '@/core/ui/button';
import { Input } from '@/core/ui/input';
import { Label } from '@/core/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/core/ui/card';
import { Separator } from '@/core/ui/separator';
import { useAuthStore } from '@/infra/auth/auth-store';
import { login } from '@/modules/auth/http';
import { SelectCorretoraDialog } from '@/modules/auth/components/select-corretora-dialog';
import { useSwitchCorretora } from '@/modules/corretoras/http';

export const Route = createFileRoute('/_auth/login')({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: (search.redirect as string) || '/dashboard',
  }),
  component: LoginPage,
});


const ReCAPTCHA = lazy(() => import('react-google-recaptcha'));

const loginSchema = z.object({
  email: z.string().email('Email invalido'),
  password: z.string().min(1, 'Senha e obrigatoria'),
});

type LoginFormData = z.infer<typeof loginSchema>;

function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const showCaptcha = failedAttempts >= 2;
  const [showCorretoraDialog, setShowCorretoraDialog] = useState(false);
  const [corretoras, setCorretoras] = useState<any[]>([]);
  const [loginToken, setLoginToken] = useState<string>('');
  const [loginUsuario, setLoginUsuario] = useState<any>(null);
  const [loginPermissoes, setLoginPermissoes] = useState<string[]>([]);

  const { theme, setTheme } = useThemeStore();
  const navigate = useNavigate();
  const { redirect: redirectTo } = Route.useSearch();
  const { setAuth } = useAuthStore();
  const { mutate: switchCorretora, isPending: isSwitching } =
    useSwitchCorretora();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const onSubmit = async (data: LoginFormData) => {
    if (showCaptcha && !recaptchaToken) {
      toast.error('Por favor, complete a verificação de segurança.');
      return;
    }
    setIsLoading(true);
    try {
      const response = await login({
        ...data,
        recaptchaToken: recaptchaToken ?? undefined,
      } as any);

      const {
        token,
        refreshToken: rToken,
        usuario,
        permissoes = [],
        corretora,
        corretoras: corretorasDisponiveis,
      } = response as any;

      if (!usuario) {
        throw new Error('Resposta de login inválida - usuário não encontrado');
      }

      if (corretorasDisponiveis && corretorasDisponiveis.length > 1) {
        setCorretoras(corretorasDisponiveis);
        setLoginToken(token);
        setLoginUsuario(usuario);
        setLoginPermissoes(permissoes || []);
        setShowCorretoraDialog(true);
        setIsLoading(false);
        return;
      }

      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const tokenPayload = JSON.parse(atob(base64));

      const userData = {
        id: usuario.id,
        sub: tokenPayload.sub || usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        avatarUrl: usuario.avatarUrl || null,
        corretoraId: corretora?.id || tokenPayload.corretoraId || '',
        corretoraSubdominio: corretora?.subdominio || null,
        cargoId: tokenPayload.cargoId || null,
        isAdmin: tokenPayload.isAdmin || false,
        isGestor: tokenPayload.isGestor || false,
        isVendedor: tokenPayload.isVendedor || false,
        isLiderEquipe: tokenPayload.isLiderEquipe || false,
        permissoes: permissoes || [],
        cargo: tokenPayload.cargoId
          ? {
              id: tokenPayload.cargoId,
              isAdmin: tokenPayload.isAdmin || false,
              isGestor: tokenPayload.isGestor || false,
              isVendedor: tokenPayload.isVendedor || false,
            }
          : null,
      };

      setAuth(userData, token, rToken);
      setFailedAttempts(0);
      toast.success('Login realizado com sucesso!');
      navigate({ to: redirectTo });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Erro ao fazer login';
      toast.error(message);
      setFailedAttempts((prev) => prev + 1);
      if (typeof window !== 'undefined' && (window as any).grecaptcha) {
        (window as any).grecaptcha.reset();
      }
      setRecaptchaToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectCorretora = (corretoraId: string) => {
    const corretoraAtual = corretoras.find((c) => c.id === corretoraId);
    if (!corretoraAtual) return;

    if (corretoraAtual.ativa) {
      const base64Url = loginToken.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const tokenPayload = JSON.parse(atob(base64));

      const userData = {
        id: tokenPayload.sub,
        sub: tokenPayload.sub,
        nome: loginUsuario?.nome || '',
        email: loginUsuario?.email || '',
        avatarUrl: loginUsuario?.avatarUrl || null,
        corretoraId: corretoraId,
        cargoId: tokenPayload.cargoId || null,
        isAdmin: tokenPayload.isAdmin || false,
        isGestor: tokenPayload.isGestor || false,
        isVendedor: tokenPayload.isVendedor || false,
        isLiderEquipe: tokenPayload.isLiderEquipe || false,
        permissoes: loginPermissoes,
        cargo: tokenPayload.cargoId
          ? {
              id: tokenPayload.cargoId,
              isAdmin: tokenPayload.isAdmin || false,
              isGestor: tokenPayload.isGestor || false,
              isVendedor: tokenPayload.isVendedor || false,
            }
          : null,
      };

      setAuth(userData, loginToken);
      toast.success('Login realizado com sucesso!');
      navigate({ to: redirectTo });
      return;
    }

    setAuth(
      {
        id: '',
        sub: '',
        nome: '',
        email: '',
        corretoraId: '',
        cargoId: null,
        isAdmin: false,
        isGestor: false,
        isVendedor: false,
        isLiderEquipe: false,
        permissoes: [],
      },
      loginToken,
    );

    switchCorretora(corretoraId, {
      onSuccess: () => {
        toast.success('Login realizado com sucesso!');
        navigate({ to: redirectTo });
      },
      onError: (error: any) => {
        toast.error(error?.message || 'Erro ao trocar de corretora');
        setShowCorretoraDialog(false);
      },
    });
  };

  return (
    <div className="fixed inset-0 bg-white dark:bg-zinc-950 overflow-hidden">
      <div className="flex h-full">
        {/* Left Side - Clean brand panel */}
        <div className="hidden lg:flex lg:w-1/2 relative bg-primary">
          {/* Subtle dot pattern */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)`,
              backgroundSize: '32px 32px',
            }}
          />

          {/* Divider */}
          <div className="absolute right-0 top-0 bottom-0 w-px bg-white/20" />

          {/* Content */}
          <div className="relative z-10 flex flex-col justify-between h-full p-12">
            {/* Logo SVG */}
            <div>
              <img
                src="/logo.svg"
                alt="EcoSistema"
                width={100}
                style={{ height: 'auto' }}
              />
            </div>

            {/* Center message */}
            <div className="space-y-4">
              <h1 className="text-4xl font-bold text-white leading-tight">
                Gerencie seu
                <br />
                negócio com
                <br />
                inteligência.
              </h1>
              <p className="text-white/70 text-base leading-relaxed max-w-xs">
                Plataforma completa para corretoras de seguros. Clientes,
                apólices e documentos em um só lugar.
              </p>
            </div>

            {/* Footer */}
            <p className="text-white/40 text-xs tracking-widest uppercase">
              ecosistema · crm para seguros
            </p>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="flex-1 lg:w-1/2 flex flex-col">
          {/* Top bar with back button and theme toggle */}
          <div className="flex items-center justify-between px-6 pt-6 lg:px-10">
            <Link to="/">
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-all duration-200 -ml-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-all duration-200 p-2"
            >
              {!mounted ? (
                <div className="h-4 w-4" />
              ) : theme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Form centered in remaining space */}
          <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
            <div className="w-full max-w-[380px]">
            <Card className="shadow-sm border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-900">
              <CardHeader className="space-y-2 pb-6 text-center">
                <CardTitle className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
                  Bem-vindo de volta
                </CardTitle>
                <CardDescription className="text-gray-500 dark:text-gray-400">
                  Digite suas credenciais para acessar o dashboard
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6 px-6">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                  {/* Email Field */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="email"
                      className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="nome@empresa.com"
                      autoCapitalize="none"
                      autoComplete="email"
                      autoCorrect="off"
                      disabled={isLoading}
                      {...register('email')}
                      className={`h-11 bg-white dark:bg-zinc-800 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus-visible:ring-primary transition-colors ${
                        errors.email ? 'border-red-500' : ''
                      }`}
                    />
                    {errors.email && (
                      <p className="text-sm text-red-500">
                        {errors.email.message}
                      </p>
                    )}
                  </div>

                  {/* Password Field */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor="password"
                        className="text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        Senha
                      </Label>
                      <Link
                        to="/recuperar-senha"
                        className="text-sm text-primary hover:underline transition-colors duration-200"
                      >
                        Esqueceu a senha?
                      </Link>
                    </div>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Digite sua senha"
                        autoCapitalize="none"
                        autoComplete="current-password"
                        autoCorrect="off"
                        disabled={isLoading}
                        {...register('password')}
                        className={`h-11 pr-10 bg-white dark:bg-zinc-800 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus-visible:ring-primary transition-colors ${
                          errors.password ? 'border-red-500' : ''
                        }`}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={togglePasswordVisibility}
                        disabled={isLoading}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors" />
                        )}
                        <span className="sr-only">
                          {showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                        </span>
                      </Button>
                    </div>
                    {errors.password && (
                      <p className="text-sm text-red-500">
                        {errors.password.message}
                      </p>
                    )}
                  </div>

                  {/* reCAPTCHA v2 — aparece após 2 tentativas falhas */}
                  {showCaptcha && import.meta.env.VITE_RECAPTCHA_SITE_KEY && (
                    <div className="flex justify-center">
                      <ReCAPTCHA
                        sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
                        onChange={(token) => setRecaptchaToken(token)}
                        onExpired={() => setRecaptchaToken(null)}
                        theme={theme === 'dark' ? 'dark' : 'light'}
                      />
                    </div>
                  )}

                  {/* Submit Button */}
                  <div className="pt-1">
                    <Button
                      disabled={isLoading || (showCaptcha && !recaptchaToken)}
                      className="w-full h-11 bg-primary hover:bg-primary-hover text-primary-foreground font-medium transition-colors duration-200 group"
                      size="lg"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Entrando...
                        </>
                      ) : (
                        <>
                          Entrar no Dashboard
                          <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>

              <CardFooter className="flex flex-col space-y-4 px-6 pb-6">
                <Separator className="bg-gray-100 dark:bg-white/10" />
                <p className="text-center text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
                  Ao continuar, você concorda com nossos{' '}
                  <Link
                    to="/termos"
                    className="text-gray-600 dark:text-gray-400 underline underline-offset-4 hover:text-primary transition-colors duration-200"
                  >
                    Termos de Serviço
                  </Link>{' '}
                  e{' '}
                  <Link
                    to="/privacidade"
                    className="text-gray-600 dark:text-gray-400 underline underline-offset-4 hover:text-primary transition-colors duration-200"
                  >
                    Política de Privacidade
                  </Link>
                  .
                </p>
              </CardFooter>
            </Card>

            {/* Additional Info */}
            <div className="text-center mt-5">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Não tem uma conta?{' '}
                <Link
                  to="/cadastro"
                  className="font-medium text-primary hover:underline transition-all duration-200"
                >
                  Entre em contato
                </Link>
              </p>
            </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dialog de seleção de corretora */}
      <SelectCorretoraDialog
        open={showCorretoraDialog}
        corretoras={corretoras}
        onSelect={handleSelectCorretora}
        isLoading={isSwitching}
      />
    </div>
  );
}

function LoginPage() {
  return <LoginForm />;
}
