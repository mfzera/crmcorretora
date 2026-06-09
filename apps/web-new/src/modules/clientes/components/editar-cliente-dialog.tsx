
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Edit, User, Building2, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/core/ui/dialog';
import { Button } from '@/core/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/core/ui/form';
import { Input } from '@/core/ui/input';
import { toast } from 'sonner';
import { handleApiError, applyApiErrorsToForm } from '@/core/utils/handle-api-error';
import { useUpdateClient } from '../http';

import {
  validateCPF,
  validateCNPJ,
  formatCPF,
  formatCNPJ,
  formatPhone,
  formatCEP,
  digitsOnly,
} from '@/core/validators/documento';
import type { Cliente } from '@/types/cliente';

// Schema para Pessoa Física
const schemaPF = z.object({
  tipoPessoa: z.literal('PF'),
  nome: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  cpf: z.string().refine((val) => validateCPF(val), 'CPF inválido'),
  rg: z.string().optional(),
  dataNascimento: z.string().optional(),
  email: z.string().email('Email inválido'),
  telefone: z.string().min(10, 'Telefone inválido'),
  celular: z.string().optional(),
  cep: z.string().optional(),
  logradouro: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
});

// Schema para Pessoa Jurídica
const schemaPJ = z.object({
  tipoPessoa: z.literal('PJ'),
  razaoSocial: z
    .string()
    .min(3, 'Razão Social deve ter no mínimo 3 caracteres'),
  nomeFantasia: z.string().optional(),
  cnpj: z.string().refine((val) => validateCNPJ(val), 'CNPJ inválido'),
  inscricaoEstadual: z.string().optional(),
  inscricaoMunicipal: z.string().optional(),
  email: z.string().email('Email inválido'),
  telefone: z.string().min(10, 'Telefone inválido'),
  celular: z.string().optional(),
  cep: z.string().optional(),
  logradouro: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
});

type FormDataPF = z.infer<typeof schemaPF>;
type FormDataPJ = z.infer<typeof schemaPJ>;
type FormData = FormDataPF | FormDataPJ;

interface EditarClienteDialogProps {
  cliente: Cliente;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function EditarClienteDialog({
  cliente,
  trigger,
  onSuccess,
}: EditarClienteDialogProps) {
  const [open, setOpen] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const atualizarCliente = useUpdateClient();

  const buscarCep = async (cep: string) => {
    const digits = digitsOnly(cep);
    if (digits.length !== 8) return;
    setBuscandoCep(true);
    try {
      const res = await fetch(`/api/cep/${digits}`);
      const data = await res.json();
      if (data.erro) {
        toast.error('CEP não encontrado');
        return;
      }
      form.setValue('logradouro', data.logradouro || '');
      form.setValue('bairro', data.bairro || '');
      form.setValue('cidade', data.localidade || '');
      form.setValue('estado', data.uf || '');
    } catch (error) {
      toast.error(handleApiError(error));
    } finally {
      setBuscandoCep(false);
    }
  };

  const schema = cliente.tipoPessoa === 'PF' ? schemaPF : schemaPJ;

  const defaultValues = {
    tipoPessoa: cliente.tipoPessoa,
    ...(cliente.tipoPessoa === 'PF'
      ? {
          nome: cliente.nome || '',
          cpf: formatCPF(cliente.cpf || ''),
          rg: cliente.rg || '',
          dataNascimento: cliente.dataNascimento || '',
        }
      : {
          razaoSocial: cliente.razaoSocial || '',
          nomeFantasia: cliente.nomeFantasia || '',
          cnpj: formatCNPJ(cliente.cnpj || ''),
          inscricaoEstadual: cliente.inscricaoEstadual || '',
          inscricaoMunicipal: cliente.inscricaoMunicipal || '',
        }),
    email: cliente.email || '',
    telefone: formatPhone(cliente.telefone || ''),
    celular: cliente.celular ? formatPhone(cliente.celular) : '',
    cep: cliente.endereco?.cep ? formatCEP(cliente.endereco.cep) : '',
    logradouro: cliente.endereco?.logradouro || '',
    numero: cliente.endereco?.numero || '',
    complemento: cliente.endereco?.complemento || '',
    bairro: cliente.endereco?.bairro || '',
    cidade: cliente.endereco?.cidade || '',
    estado: cliente.endereco?.estado || '',
  };

  const form = useForm({
    // @ts-ignore - Zod discriminated union types are complex
    resolver: zodResolver(schema),
    defaultValues: defaultValues as any,
  });

  // Reset form quando o dialog abrir
  useEffect(() => {
    if (open) {
      const resetData = {
        tipoPessoa: cliente.tipoPessoa,
        ...(cliente.tipoPessoa === 'PF'
          ? {
              nome: cliente.nome || '',
              cpf: formatCPF(cliente.cpf || ''),
              rg: cliente.rg || '',
              dataNascimento: cliente.dataNascimento || '',
            }
          : {
              razaoSocial: cliente.razaoSocial || '',
              nomeFantasia: cliente.nomeFantasia || '',
              cnpj: formatCNPJ(cliente.cnpj || ''),
              inscricaoEstadual: cliente.inscricaoEstadual || '',
              inscricaoMunicipal: cliente.inscricaoMunicipal || '',
            }),
        email: cliente.email || '',
        telefone: formatPhone(cliente.telefone || ''),
        celular: cliente.celular ? formatPhone(cliente.celular) : '',
        cep: cliente.endereco?.cep ? formatCEP(cliente.endereco.cep) : '',
        logradouro: cliente.endereco?.logradouro || '',
        numero: cliente.endereco?.numero || '',
        complemento: cliente.endereco?.complemento || '',
        bairro: cliente.endereco?.bairro || '',
        cidade: cliente.endereco?.cidade || '',
        estado: cliente.endereco?.estado || '',
      };
      // @ts-ignore - Complex conditional types with union
      form.reset(resetData);
    }
  }, [open, cliente, form]);

  const handleSubmit = async (data: FormData) => {
    try {
      // Limpar máscaras e separar dados do cliente dos dados de endereço
      const cleanedData: any = {
        tipoPessoa: data.tipoPessoa,
        email: data.email,
        telefone: digitsOnly(data.telefone),
        celular: data.celular ? digitsOnly(data.celular) : undefined,
      };

      // Adicionar campos específicos de PF
      if (data.tipoPessoa === 'PF') {
        cleanedData.nome = data.nome;
        cleanedData.cpf = digitsOnly(data.cpf);
        cleanedData.rg = data.rg;
        if (data.dataNascimento && data.dataNascimento.trim() !== '') {
          cleanedData.dataNascimento = data.dataNascimento;
        }
      }

      // Adicionar campos específicos de PJ
      if (data.tipoPessoa === 'PJ') {
        cleanedData.razaoSocial = data.razaoSocial;
        cleanedData.nomeFantasia = data.nomeFantasia;
        cleanedData.cnpj = digitsOnly(data.cnpj);
        cleanedData.inscricaoEstadual = data.inscricaoEstadual;
        cleanedData.inscricaoMunicipal = data.inscricaoMunicipal;
      }

      await atualizarCliente.mutateAsync({ id: cliente.id, ...cleanedData });

      toast.success('Cliente atualizado com sucesso!');
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      if (!applyApiErrorsToForm(error, form.setError)) {
        toast.error(handleApiError(error));
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon">
            <Edit className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className={`rounded-xl p-3 ${cliente.tipoPessoa === 'PF' ? 'bg-primary/10' : 'bg-blue-500/10'}`}
            >
              {cliente.tipoPessoa === 'PF' ? (
                <User className="h-6 w-6 text-primary" />
              ) : (
                <Building2 className="h-6 w-6 text-blue-500" />
              )}
            </div>
            <div>
              <DialogTitle>Editar Cliente</DialogTitle>
              <DialogDescription>
                {cliente.tipoPessoa === 'PF'
                  ? 'Pessoa Física'
                  : 'Pessoa Jurídica'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit as any)}
            className="space-y-6 mt-4"
          >
            {/* Dados Principais */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {cliente.tipoPessoa === 'PF'
                  ? 'Dados Pessoais'
                  : 'Dados Empresariais'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {cliente.tipoPessoa === 'PF' ? (
                  <>
                    <FormField
                      control={form.control}
                      name="nome"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Nome Completo *</FormLabel>
                          <FormControl>
                            <Input placeholder="João da Silva" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="cpf"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CPF *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="000.000.000-00"
                              {...field}
                              onChange={(e) => {
                                const formatted = formatCPF(e.target.value);
                                field.onChange(formatted);
                              }}
                              disabled
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="rg"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>RG</FormLabel>
                          <FormControl>
                            <Input placeholder="00.000.000-0" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="dataNascimento"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Data de Nascimento</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                ) : (
                  <>
                    <FormField
                      control={form.control}
                      name="razaoSocial"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Razão Social *</FormLabel>
                          <FormControl>
                            <Input placeholder="Empresa LTDA" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="nomeFantasia"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Nome Fantasia</FormLabel>
                          <FormControl>
                            <Input placeholder="Empresa" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="cnpj"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CNPJ *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="00.000.000/0000-00"
                              {...field}
                              onChange={(e) => {
                                const formatted = formatCNPJ(e.target.value);
                                field.onChange(formatted);
                              }}
                              disabled
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="inscricaoEstadual"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Inscrição Estadual</FormLabel>
                          <FormControl>
                            <Input placeholder="000.000.000.000" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="inscricaoMunicipal"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Inscrição Municipal</FormLabel>
                          <FormControl>
                            <Input placeholder="000000" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
              </div>
            </div>

            {/* Contato */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Contato
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Email *</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="contato@email.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="telefone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="(00) 00000-0000"
                          {...field}
                          onChange={(e) => {
                            const formatted = formatPhone(e.target.value);
                            field.onChange(formatted);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="celular"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Celular</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="(00) 00000-0000"
                          {...field}
                          onChange={(e) => {
                            const formatted = formatPhone(e.target.value);
                            field.onChange(formatted);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Endereço */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Endereço
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="cep"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CEP</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            placeholder="00000-000"
                            {...field}
                            onChange={(e) => {
                              const formatted = formatCEP(e.target.value);
                              field.onChange(formatted);
                            }}
                            onBlur={() => buscarCep(field.value)}
                          />
                          {buscandoCep && (
                            <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="logradouro"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Logradouro</FormLabel>
                      <FormControl>
                        <Input placeholder="Rua, Avenida..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="numero"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número</FormLabel>
                      <FormControl>
                        <Input placeholder="123" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="complemento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Complemento</FormLabel>
                      <FormControl>
                        <Input placeholder="Apto, Sala..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bairro"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bairro</FormLabel>
                      <FormControl>
                        <Input placeholder="Centro" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cidade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cidade</FormLabel>
                      <FormControl>
                        <Input placeholder="São Paulo" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="estado"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado</FormLabel>
                      <FormControl>
                        <Input placeholder="SP" {...field} maxLength={2} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={atualizarCliente.isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={atualizarCliente.isPending}>
                {atualizarCliente.isPending
                  ? 'Salvando...'
                  : 'Salvar Alterações'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
