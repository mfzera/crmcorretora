import { createFileRoute } from '@tanstack/react-router';

import { memo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Button } from '@/core/ui/button';
import { Input } from '@/core/ui/input';
import { Label } from '@/core/ui/label';
import { toast } from 'sonner';
import { adminAuth } from '@/infra/auth/admin-auth';
import { ArrowLeft, ArrowRight, KeyRound, Smartphone } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { lazy } from 'react';

export const Route = createFileRoute('/_admin/admin/login')({
  component: AdminLoginPage,
});


const ReCAPTCHA = lazy(() => import('react-google-recaptcha'));

const LoginBackground = memo(function LoginBackground() {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
          maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 h-[440px] w-[720px] -translate-x-1/2 rounded-full"
        style={{
          background: 'radial-gradient(closest-side, var(--admin-accent-glow), transparent 70%)',
          opacity: 0.6,
        }}
      />
    </>
  );
});

function AdminLoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const showCaptcha = failedAttempts >= 2;

  const [step, setStep] = useState<'credentials' | 'totp'>('credentials');
  const [tempToken, setTempToken] = useState<string>('');
  const [totpCode, setTotpCode] = useState('');

  const navigate = useNavigate();

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (showCaptcha && !recaptchaToken) {
      toast.error('Complete a verificação de segurança.');
      return;
    }
    setIsLoading(true);

    try {
      const result = await adminAuth.login(email, password, recaptchaToken ?? undefined);

      if ('requiresTwoFactor' in result) {
        setTempToken(result.tempToken);
        setStep('totp');
        setFailedAttempts(0);
        return;
      }

      toast.success('Acesso autorizado', {
        description: 'Bem-vindo ao painel administrativo.',
      });
      setFailedAttempts(0);
      navigate({ to: '/admin/dashboard' });
    } catch (error) {
      toast.error('Credenciais inválidas', {
        description: error instanceof Error ? error.message : 'Verifique e tente novamente.',
      });
      setFailedAttempts((prev) => prev + 1);
      queueMicrotask(() => {
        if (typeof window !== 'undefined' && (window as any).grecaptcha) {
          (window as any).grecaptcha.reset();
        }
      });
      setRecaptchaToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTotpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await adminAuth.verify2fa(tempToken, totpCode);

      toast.success('Verificação concluída', {
        description: 'Bem-vindo ao painel administrativo.',
      });
      navigate({ to: '/admin/dashboard' });
    } catch (error) {
      toast.error('Código inválido', {
        description: error instanceof Error ? error.message : 'Código incorreto ou expirado.',
      });
      setTotpCode('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <LoginBackground />

      <Link
        to="/"
        className="absolute left-6 top-6 z-10 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Início
      </Link>

      <div className="relative z-10 flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="mb-8 space-y-3 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-[var(--admin-surface-elevated)] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
              {step === 'credentials' ? (
                <>
                  <KeyRound className="h-3 w-3" />
                  Acesso restrito
                </>
              ) : (
                <>
                  <Smartphone className="h-3 w-3" />
                  Verificação em 2 etapas
                </>
              )}
            </div>
            <h1 className="font-sora text-4xl font-semibold tracking-tight">
              {step === 'credentials' ? 'Painel administrativo' : 'Confirme sua identidade'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {step === 'credentials'
                ? 'Use suas credenciais para continuar.'
                : 'Insira o código de 6 dígitos do seu app autenticador.'}
            </p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-6 md:p-8">
            {step === 'credentials' ? (
              <form onSubmit={handleCredentialsSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs uppercase tracking-wider text-muted-foreground">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    className="h-11"
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-xs uppercase tracking-wider text-muted-foreground">
                    Senha
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="h-11"
                    autoComplete="current-password"
                  />
                </div>
                {showCaptcha && import.meta.env.VITE_RECAPTCHA_SITE_KEY && (
                  <div className="flex justify-center">
                    <ReCAPTCHA
                      sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
                      theme="dark"
                      onChange={(token) => setRecaptchaToken(token)}
                      onExpired={() => setRecaptchaToken(null)}
                    />
                  </div>
                )}
                <Button
                  type="submit"
                  className="group h-11 w-full rounded-xl bg-primary text-primary-foreground hover:bg-[color:var(--primary-hover)]"
                  disabled={isLoading || (showCaptcha && !recaptchaToken)}
                >
                  {isLoading ? 'Verificando...' : 'Entrar'}
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Button>
              </form>
            ) : (
              <form onSubmit={handleTotpSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="totpCode" className="text-xs uppercase tracking-wider text-muted-foreground">
                    Código de verificação
                  </Label>
                  <Input
                    id="totpCode"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="000000"
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                    required
                    disabled={isLoading}
                    autoFocus
                    className="h-14 text-center font-sora text-3xl tracking-[0.5em]"
                  />
                </div>
                <Button
                  type="submit"
                  className="h-11 w-full rounded-xl bg-primary text-primary-foreground hover:bg-[color:var(--primary-hover)]"
                  disabled={isLoading || totpCode.length !== 6}
                >
                  {isLoading ? 'Verificando...' : 'Verificar'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-10 w-full"
                  onClick={() => {
                    setStep('credentials');
                    setTempToken('');
                    setTotpCode('');
                  }}
                >
                  Voltar
                </Button>
              </form>
            )}
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Área protegida por autenticação em dois fatores.
          </p>
        </div>
      </div>
    </div>
  );
}

function AdminLoginPage() {
  return <AdminLoginForm />;
}
