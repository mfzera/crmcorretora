import { createFileRoute } from '@tanstack/react-router';

import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Loader2, Mail } from 'lucide-react';
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

export const Route = createFileRoute('/_auth/recuperar-senha')({
  component: RecuperarSenhaPage,
});

const recuperarSenhaSchema = z.object({
  email: z.string().email('Email inválido'),
});

type RecuperarSenhaFormData = z.infer<typeof recuperarSenhaSchema>;

function RecuperarSenhaPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [emailEnviado, setEmailEnviado] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<RecuperarSenhaFormData>({
    resolver: zodResolver(recuperarSenhaSchema),
  });

  const formValues = watch();

  const onSubmit = async (data: RecuperarSenhaFormData) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/auth/request-password-reset`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: data.email }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || 'Erro ao enviar email de recuperação',
        );
      }

      setEmailEnviado(true);
      toast.success('Email de recuperação enviado com sucesso!');
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Erro ao enviar email de recuperação';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

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
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="font-inter text-2xl font-semibold tracking-tight text-white">
                {emailEnviado ? 'Email Enviado!' : 'Recuperar Senha'}
              </CardTitle>
              <CardDescription className="font-inter text-gray-400">
                {emailEnviado
                  ? 'Verifique seu email para instruções de recuperação'
                  : 'Digite seu email para receber instruções de recuperação'}
              </CardDescription>
            </CardHeader>

            {!emailEnviado ? (
              <>
                <CardContent className="space-y-6 px-6">
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                    {/* Email Field */}
                    <div className="space-y-2">
                      <Label
                        htmlFor="email"
                        className="font-inter text-sm font-medium text-gray-300"
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
                        className={`font-inter h-12 transition-all duration-300 focus:ring-2 focus:ring-primary/20 hover:border-primary/50 bg-black/50 border-white/20 text-white placeholder:text-gray-500 ${
                          errors.email ? 'border-red-500' : ''
                        }`}
                      />
                      {errors.email && (
                        <p className="font-inter text-sm text-red-400">
                          {errors.email.message}
                        </p>
                      )}
                    </div>

                    {/* Submit Button */}
                    <div className="pt-2">
                      <Button
                        disabled={isLoading || !formValues.email}
                        className="font-inter w-full h-12 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] bg-white hover:bg-gray-100 text-black font-medium"
                        size="lg"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Enviando...
                          </>
                        ) : (
                          <>
                            <Mail className="mr-2 h-4 w-4" />
                            Enviar Email de Recuperação
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
                      Um email foi enviado para{' '}
                      <strong className="text-white">{formValues.email}</strong>{' '}
                      com instruções para redefinir sua senha.
                    </p>
                  </div>
                </CardContent>

                <CardFooter className="flex flex-col space-y-4 px-6 pb-6">
                  <Link to="/login" search={{ redirect: '' }} className="w-full">
                    <Button
                      variant="outline"
                      className="w-full h-12 border-white/20 hover:bg-white/10 text-white"
                    >
                      Voltar para o login
                    </Button>
                  </Link>

                  <p className="font-inter text-center text-xs text-gray-400 leading-relaxed">
                    Não recebeu o email?{' '}
                    <button
                      onClick={() => setEmailEnviado(false)}
                      className="text-primary hover:underline transition-all duration-300"
                    >
                      Reenviar
                    </button>
                  </p>
                </CardFooter>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
