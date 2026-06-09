import { createFileRoute } from '@tanstack/react-router';

import { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2, ShieldCheck } from 'lucide-react';

import { Button } from '@/core/ui/button';
import { Input } from '@/core/ui/input';
import { Label } from '@/core/ui/label';
import { usePortalAuthStore } from '@/infra/auth/portal-auth-store';
import { portalLogin, getCorretoraPublica } from '@/infra/http/portal-api';

export const Route = createFileRoute('/_portal/portal/$subdominio/login')({
  component: PortalLoginPage,
});


const loginSchema = z.object({
  documento: z.string().min(11, 'Informe seu CPF ou CNPJ'),
  dataNascimento: z.string().min(1, 'Informe sua data de nascimento'),
});

type LoginFormData = z.infer<typeof loginSchema>;

function PortalLoginPage() {
  const { subdominio } = Route.useParams();
  const navigate = useNavigate();
  const { setPortalAuth, isAuthenticated } = usePortalAuthStore();

  const [loading, setLoading] = useState(false);
  const [corretoraNome, setCorretoraNome] = useState<string | null>(null);
  const [corretoraInitials, setCorretoraInitials] = useState('C');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });

  useEffect(() => {
    if (isAuthenticated) {
      navigate({ to: '/portal/$subdominio', params: { subdominio }, replace: true });
    }
  }, [isAuthenticated, subdominio, navigate]);

  useEffect(() => {
    getCorretoraPublica(subdominio)
      .then((c) => {
        const nome = c.nomeFantasia ?? c.razaoSocial;
        setCorretoraNome(nome);
        const initials = nome
          .split(' ')
          .filter(Boolean)
          .slice(0, 2)
          .map((w) => w[0].toUpperCase())
          .join('') || 'C';
        setCorretoraInitials(initials);
      })
      .catch(() => null);
  }, [subdominio]);

  async function onSubmit(data: LoginFormData) {
    setLoading(true);
    try {
      const documento = data.documento.replace(/\D/g, '');

      const result = await portalLogin({
        subdominio,
        documento,
        dataNascimento: data.dataNascimento,
      });

      setPortalAuth(
        {
          clienteId: result.cliente.id,
          nome: result.cliente.nome,
          tipoPessoa: result.cliente.tipoPessoa,
          corretoraId: subdominio,
        },
        {
          nomeFantasia: result.corretora.nomeFantasia,
          subdominio,
        },
        result.token,
      );

      navigate({ to: `/portal/${subdominio}` });
    } catch {
      toast.error('Credenciais inválidas. Verifique seu CPF/CNPJ e data de nascimento.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0b] p-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo + nome corretora */}
        <div className="flex flex-col items-center gap-4">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-[14px] text-2xl font-black text-black"
            style={{ backgroundColor: '#00FF87', fontFamily: '"Sora", sans-serif' }}
          >
            {corretoraInitials}
          </div>
          <div className="text-center">
            {corretoraNome ? (
              <h1
                className="text-xl font-bold text-white"
                style={{ fontFamily: '"Sora", sans-serif', letterSpacing: '-0.02em' }}
              >
                {corretoraNome}
              </h1>
            ) : (
              <h1
                className="text-xl font-bold text-white"
                style={{ fontFamily: '"Sora", sans-serif' }}
              >
                Portal do Segurado
              </h1>
            )}
            <p className="mt-1 text-sm text-[#525252]">Portal do Segurado</p>
          </div>
        </div>

        {/* Formulário */}
        <div className="rounded-xl border border-[#262628] bg-[#18181b] p-6">
          <div className="mb-5">
            <h2
              className="text-base font-semibold text-white"
              style={{ fontFamily: '"Sora", sans-serif' }}
            >
              Acesse sua área
            </h2>
            <p className="mt-1 text-sm text-[#525252]">
              Informe seu CPF (ou CNPJ) e data de nascimento para entrar.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="documento" className="text-sm text-[#a1a1aa]">
                CPF ou CNPJ
              </Label>
              <Input
                id="documento"
                placeholder="000.000.000-00"
                className="border-[#262628] bg-[#0a0a0b] text-white placeholder:text-[#525252] focus-visible:ring-[#00FF87]/30 focus-visible:border-[#00FF87]/50"
                {...register('documento')}
              />
              {errors.documento && (
                <p className="text-xs text-red-400">{errors.documento.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dataNascimento" className="text-sm text-[#a1a1aa]">
                Data de nascimento
              </Label>
              <Input
                id="dataNascimento"
                type="date"
                className="border-[#262628] bg-[#0a0a0b] text-white focus-visible:ring-[#00FF87]/30 focus-visible:border-[#00FF87]/50"
                {...register('dataNascimento')}
              />
              {errors.dataNascimento && (
                <p className="text-xs text-red-400">{errors.dataNascimento.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-[#00FF87] text-black font-semibold hover:bg-[#00FF87]/90 focus-visible:ring-[#00FF87]/30"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Entrar'
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-[#525252]">
          Problemas para acessar? Entre em contato com sua corretora.
        </p>
      </div>
    </div>
  );
}
