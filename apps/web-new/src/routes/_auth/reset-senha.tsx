import { createFileRoute } from '@tanstack/react-router';

import { useState, useEffect, Suspense } from 'react';
import { Link } from '@tanstack/react-router';
import { useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Loader2, Lock, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

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

export const Route = createFileRoute('/_auth/reset-senha')({
  validateSearch: (search) => ({
    token: (search.token as string) ?? undefined,
  }),
  component: ResetSenhaPage,
});

const resetSenhaSchema = z
  .object({
    novaSenha: z
      .string()
      .min(8, 'A senha deve ter no mínimo 8 caracteres')
      .regex(/[A-Z]/, 'A senha deve conter pelo menos uma letra maiúscula')
      .regex(/[a-z]/, 'A senha deve conter pelo menos uma letra minúscula')
      .regex(/[0-9]/, 'A senha deve conter pelo menos um número'),
    confirmarSenha: z.string().min(1, 'Confirme sua senha'),
  })
  .refine((data) => data.novaSenha === data.confirmarSenha, {
    message: 'As senhas não coincidem',
    path: ['confirmarSenha'],
  });

type ResetSenhaFormData = z.infer<typeof resetSenhaSchema>;

function ResetSenhaContent() {
  const navigate = useNavigate();
  const { token = null } = Route.useSearch();

  const [isLoading, setIsLoading] = useState(false);
  const [senhaRedefinida, setSenhaRedefinida] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<ResetSenhaFormData>({
    resolver: zodResolver(resetSenhaSchema),
  });

  const formValues = watch();

  useEffect(() => {
    if (!token) {
      toast.error('Token de recuperação inválido');
      navigate({ to: '/recuperar-senha' });
    }
  }, [token, navigate]);

  const onSubmit = async (data: ResetSenhaFormData) => {
    if (!token) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/auth/reset-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token,
            novaSenha: data.novaSenha,
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao redefinir senha');
      }

      setSenhaRedefinida(true);
      toast.success('Senha redefinida com sucesso!');

      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate({ to: '/login', search: { redirect: '' } });
      }, 2000);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Erro ao redefinir senha';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      {/* Dense dotted grid background pattern */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />

      {/* Back Button */}
      <div className="absolute top-6 left-6 z-20 animate-in slide-in-from-left-4 fade-in-0 duration-700">
        <Link to="/login" search={{ redirect: '' }}>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 hover:bg-white/10 transition-all duration-300 hover:scale-105 text-white border border-white/20"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para o login
          </Button>
        </Link>
      </div>

      <div className="flex h-full items-center justify-center p-6">
        <div className="w-full max-w-[420px] animate-in slide-in-from-bottom-8 fade-in-0 duration-1000">
          <Card className="shadow-xl border border-white/10 bg-zinc-900/50 backdrop-blur-sm">
            <CardHeader className="space-y-3 pb-6 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                {senhaRedefinida ? (
                  <CheckCircle2 className="h-6 w-6 text-primary" />
                ) : (
                  <Lock className="h-6 w-6 text-primary" />
                )}
              </div>
              <CardTitle className="font-inter text-2xl font-semibold tracking-tight text-white">
                {senhaRedefinida ? 'Senha Redefinida!' : 'Nova Senha'}
              </CardTitle>
              <CardDescription className="font-inter text-gray-400">
                {senhaRedefinida
                  ? 'Redirecionando para o login...'
                  : 'Digite sua nova senha abaixo'}
              </CardDescription>
            </CardHeader>

            {!senhaRedefinida ? (
              <>
                <CardContent className="space-y-6 px-6">
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                    {/* Nova Senha Field */}
                    <div className="space-y-2">
                      <Label
                        htmlFor="novaSenha"
                        className="font-inter text-sm font-medium text-gray-300"
                      >
                        Nova Senha
                      </Label>
                      <Input
                        id="novaSenha"
                        type="password"
                        placeholder="Digite sua nova senha"
                        autoCapitalize="none"
                        autoComplete="new-password"
                        autoCorrect="off"
                        disabled={isLoading}
                        {...register('novaSenha')}
                        className={`font-inter h-12 transition-all duration-300 focus:ring-2 focus:ring-primary/20 hover:border-primary/50 bg-black/50 border-white/20 text-white placeholder:text-gray-500 ${
                          errors.novaSenha ? 'border-red-500' : ''
                        }`}
                      />
                      {errors.novaSenha && (
                        <p className="font-inter text-sm text-red-400">
                          {errors.novaSenha.message}
                        </p>
                      )}
                    </div>

                    {/* Confirmar Senha Field */}
                    <div className="space-y-2">
                      <Label
                        htmlFor="confirmarSenha"
                        className="font-inter text-sm font-medium text-gray-300"
                      >
                        Confirmar Senha
                      </Label>
                      <Input
                        id="confirmarSenha"
                        type="password"
                        placeholder="Digite sua senha novamente"
                        autoCapitalize="none"
                        autoComplete="new-password"
                        autoCorrect="off"
                        disabled={isLoading}
                        {...register('confirmarSenha')}
                        className={`font-inter h-12 transition-all duration-300 focus:ring-2 focus:ring-primary/20 hover:border-primary/50 bg-black/50 border-white/20 text-white placeholder:text-gray-500 ${
                          errors.confirmarSenha ? 'border-red-500' : ''
                        }`}
                      />
                      {errors.confirmarSenha && (
                        <p className="font-inter text-sm text-red-400">
                          {errors.confirmarSenha.message}
                        </p>
                      )}
                    </div>

                    {/* Password Requirements */}
                    <div className="rounded-lg bg-gray-800/50 border border-gray-700/50 p-4">
                      <p className="text-xs text-gray-400 mb-2 font-medium">
                        A senha deve conter:
                      </p>
                      <ul className="text-xs text-gray-400 space-y-1">
                        <li>• No mínimo 8 caracteres</li>
                        <li>• Pelo menos uma letra maiúscula</li>
                        <li>• Pelo menos uma letra minúscula</li>
                        <li>• Pelo menos um número</li>
                      </ul>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-2">
                      <Button
                        disabled={
                          isLoading ||
                          !formValues.novaSenha ||
                          !formValues.confirmarSenha
                        }
                        className="font-inter w-full h-12 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] bg-white hover:bg-gray-100 text-black font-medium"
                        size="lg"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Redefinindo...
                          </>
                        ) : (
                          <>
                            <Lock className="mr-2 h-4 w-4" />
                            Redefinir Senha
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>

                <CardFooter className="flex flex-col space-y-4 px-6 pb-6">
                  <p className="font-inter text-center text-xs text-gray-400 leading-relaxed">
                    Lembrou sua senha?{' '}
                    <Link
                      to="/login"
                      search={{ redirect: '' }}
                      className="text-primary hover:underline transition-all duration-300"
                    >
                      Fazer login
                    </Link>
                  </p>
                </CardFooter>
              </>
            ) : (
              <>
                <CardContent className="px-6 pb-6">
                  <div className="rounded-lg bg-primary/10 border border-primary/20 p-4">
                    <p className="text-sm text-gray-300 text-center">
                      Sua senha foi redefinida com sucesso! Você será
                      redirecionado para a página de login em instantes.
                    </p>
                  </div>
                </CardContent>

                <CardFooter className="flex flex-col space-y-4 px-6 pb-6">
                  <Link to="/login" search={{ redirect: '' }} className="w-full">
                    <Button
                      variant="outline"
                      className="w-full h-12 border-white/20 hover:bg-white/10 text-white"
                    >
                      Ir para o login agora
                    </Button>
                  </Link>
                </CardFooter>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function ResetSenhaPage() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 bg-black flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
      }
    >
      <ResetSenhaContent />
    </Suspense>
  );
}
