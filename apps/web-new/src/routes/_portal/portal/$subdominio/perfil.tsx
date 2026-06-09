import { createFileRoute } from '@tanstack/react-router';

import { useEffect, useState } from 'react';
import { User, Phone, Mail, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/core/ui/card';
import { Button } from '@/core/ui/button';
import { Input } from '@/core/ui/input';
import { Label } from '@/core/ui/label';
import { Separator } from '@/core/ui/separator';
import {

  getPortalPerfil,
  updatePortalPerfil,
  type PerfilSegurado,
} from '@/infra/http/portal-api';

export const Route = createFileRoute('/_portal/portal/$subdominio/perfil')({
  component: PortalPerfilPage,
});

function formatCPF(cpf: string) {
  return cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
}

function formatCNPJ(cnpj: string) {
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

function formatDate(date: string) {
  const [y, m, d] = date.split('-');
  return `${d}/${m}/${y}`;
}

function PortalPerfilPage() {
  const [perfil, setPerfil] = useState<PerfilSegurado | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [celular, setCelular] = useState('');

  useEffect(() => {
    getPortalPerfil()
      .then((p) => {
        setPerfil(p);
        setEmail(p.email ?? '');
        setTelefone(p.telefone ?? '');
        setCelular(p.celular ?? '');
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await updatePortalPerfil({
        email: email || undefined,
        telefone: telefone || undefined,
        celular: celular || undefined,
      });
      toast.success('Dados de contato atualizados!');
    } catch {
      toast.error('Erro ao salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-32 animate-pulse rounded bg-muted" />
        <div className="h-40 animate-pulse rounded-lg bg-muted" />
        <div className="h-40 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (!perfil) {
    return (
      <p className="py-12 text-center text-muted-foreground">
        Não foi possível carregar o perfil.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Meu Perfil</h1>
        <p className="text-sm text-muted-foreground">
          Seus dados cadastrais e informações de contato
        </p>
      </div>

      {/* Dados pessoais (somente leitura) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4" />
            Dados Pessoais
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm">
          {perfil.tipoPessoa === 'PF' ? (
            <>
              <div>
                <p className="text-xs text-muted-foreground">Nome</p>
                <p className="font-medium">{perfil.nome ?? '-'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">CPF</p>
                <p className="font-medium font-mono">
                  {perfil.cpf ? formatCPF(perfil.cpf) : '-'}
                </p>
              </div>
              {perfil.dataNascimento && (
                <div>
                  <p className="text-xs text-muted-foreground">Data de Nascimento</p>
                  <p className="font-medium">{formatDate(perfil.dataNascimento)}</p>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">Razão Social</p>
                <p className="font-medium">{perfil.razaoSocial ?? '-'}</p>
              </div>
              {perfil.nomeFantasia && (
                <div>
                  <p className="text-xs text-muted-foreground">Nome Fantasia</p>
                  <p className="font-medium">{perfil.nomeFantasia}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground">CNPJ</p>
                <p className="font-medium font-mono">
                  {perfil.cnpj ? formatCNPJ(perfil.cnpj) : '-'}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Contato (editável) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Phone className="h-4 w-4" />
            Contato
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-1.5 text-sm">
              <Mail className="h-3.5 w-3.5" />
              E-mail
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="h-9"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="telefone" className="text-sm">Telefone</Label>
              <Input
                id="telefone"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(11) 1234-5678"
                className="h-9"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="celular" className="text-sm">Celular / WhatsApp</Label>
              <Input
                id="celular"
                value={celular}
                onChange={(e) => setCelular(e.target.value)}
                placeholder="(11) 99999-9999"
                className="h-9"
              />
            </div>
          </div>

          <Separator />

          <Button onClick={handleSave} disabled={saving} size="sm" className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? 'Salvando...' : 'Salvar contato'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
