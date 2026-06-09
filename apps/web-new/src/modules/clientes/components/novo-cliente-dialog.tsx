
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, User, Building2, Loader2 } from 'lucide-react';
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
import { DateInput } from '@/core/ui/date-input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/core/ui/tabs';
import { toast } from 'sonner';
import { handleApiError } from '@/core/utils/handle-api-error';
import { useCreateClient } from '../http';
import { ApiError } from '@/infra/http/api';
import {
  validateCPF,
  validateCNPJ,
  formatCPF,
  formatCNPJ,
  formatPhone,
  formatCEP,
  digitsOnly,
} from '@/core/validators/documento';
import type { TipoPessoa } from '@/types/cliente';

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
  // Endereço
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
  // Endereço
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

interface NovoClienteDialogProps {
  trigger?: React.ReactNode;
  onSuccess?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onClienteCriado?: (cliente: any) => void;
}

export function NovoClienteDialog({
  trigger,
  onSuccess,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onClienteCriado,
}: NovoClienteDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;
  const [tipoPessoa, setTipoPessoa] = useState<TipoPessoa>('PF');
  const [buscandoCep, setBuscandoCep] = useState(false);
  const criarCliente = useCreateClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buscarCep = async (cep: string, form: { setValue: (field: any, value: any) => void }) => {
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

  const formPF = useForm<FormDataPF>({
    resolver: zodResolver(schemaPF),
    defaultValues: {
      tipoPessoa: 'PF',
      nome: '',
      cpf: '',
      rg: '',
      dataNascimento: '',
      email: '',
      telefone: '',
      celular: '',
      cep: '',
      logradouro: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      estado: '',
    },
  });

  const formPJ = useForm<FormDataPJ>({
    resolver: zodResolver(schemaPJ),
    defaultValues: {
      tipoPessoa: 'PJ',
      razaoSocial: '',
      nomeFantasia: '',
      cnpj: '',
      inscricaoEstadual: '',
      inscricaoMunicipal: '',
      email: '',
      telefone: '',
      celular: '',
      cep: '',
      logradouro: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      estado: '',
    },
  });

  const activeForm = tipoPessoa === 'PF' ? formPF : formPJ;

  const handleSubmit = async (data: FormData) => {
    try {
      // Separar dados do cliente dos dados de endereço e contatos
      const {
        cep,
        logradouro,
        numero,
        complemento,
        bairro,
        cidade,
        estado,
        email,
        telefone,
        celular,
        ...clienteData
      } = data;

      // Montar array de endereços (se tiver dados de endereço)
      const enderecos =
        cep || logradouro
          ? [
              {
                cep: cep ? digitsOnly(cep) : undefined,
                logradouro: logradouro || undefined,
                numero: numero || undefined,
                complemento: complemento || undefined,
                bairro: bairro || undefined,
                cidade: cidade || undefined,
                uf: estado || undefined,
                principal: true,
              },
            ]
          : [];

      // Montar array de contatos
      const contatos = [];
      if (email) {
        contatos.push({
          tipo: 'EMAIL' as const,
          valor: email,
          principal: true,
        });
      }
      if (telefone) {
        contatos.push({
          tipo: 'TELEFONE' as const,
          valor: digitsOnly(telefone),
          principal: !email,
        });
      }
      if (celular) {
        contatos.push({
          tipo: 'CELULAR' as const,
          valor: digitsOnly(celular),
          principal: false,
        });
      }

      // Limpar máscaras e montar payload final
      const cleanedData = {
        tipoPessoa: data.tipoPessoa,
        nome: data.tipoPessoa === 'PF' ? data.nome : undefined,
        cpf: data.tipoPessoa === 'PF' ? digitsOnly(data.cpf) : undefined,
        dataNascimento:
          data.tipoPessoa === 'PF' &&
          'dataNascimento' in data &&
          data.dataNascimento &&
          data.dataNascimento.trim() !== ''
            ? data.dataNascimento
            : undefined,
        razaoSocial: data.tipoPessoa === 'PJ' ? data.razaoSocial : undefined,
        nomeFantasia: data.tipoPessoa === 'PJ' ? data.nomeFantasia : undefined,
        cnpj: data.tipoPessoa === 'PJ' ? digitsOnly(data.cnpj) : undefined,
        email: email || undefined,
        telefone: telefone ? digitsOnly(telefone) : undefined,
        celular: celular ? digitsOnly(celular) : undefined,
        enderecos: enderecos.length > 0 ? enderecos : undefined,
        contatos: contatos.length > 0 ? contatos : undefined,
      };

      const novoCliente = await criarCliente.mutateAsync(cleanedData as any);

      toast.success('Cliente cadastrado com sucesso!');
      setOpen(false);
      activeForm.reset();
      onSuccess?.();
      onClienteCriado?.(novoCliente);
    } catch (error) {
      toast.error(handleApiError(error));
    }
  };

  const handleTabChange = (value: string) => {
    setTipoPessoa(value as TipoPessoa);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {(trigger || controlledOpen === undefined) && (
        <DialogTrigger asChild>
          {trigger || (
            <Button className="gap-2 shadow-sm">
              <Plus className="h-4 w-4" />
              Novo Cliente
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cadastrar Novo Cliente</DialogTitle>
          <DialogDescription>
            Preencha os dados do cliente para cadastrá-lo no sistema
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={tipoPessoa}
          onValueChange={handleTabChange}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="PF" className="gap-2">
              <User className="h-4 w-4" />
              Pessoa Física
            </TabsTrigger>
            <TabsTrigger value="PJ" className="gap-2">
              <Building2 className="h-4 w-4" />
              Pessoa Jurídica
            </TabsTrigger>
          </TabsList>

          {/* Form Pessoa Física */}
          <TabsContent value="PF" className="space-y-4 mt-4">
            <Form {...formPF}>
              <form
                onSubmit={formPF.handleSubmit(handleSubmit)}
                className="space-y-6"
              >
                {/* Dados Pessoais */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Dados Pessoais
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={formPF.control}
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
                      control={formPF.control}
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
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={formPF.control}
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
                      control={formPF.control}
                      name="dataNascimento"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data de Nascimento</FormLabel>
                          <FormControl>
                            <DateInput
                              value={field.value}
                              onChange={field.onChange}
                              showQuickSelect={false}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Contato */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Contato
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={formPF.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Email *</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="joao@email.com"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={formPF.control}
                      name="telefone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefone *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="(00) 00000-0000"
                              {...field}
                              onChange={(e) => {
                                const formatted = formatPhone(
                                  e.target.value,
                                );
                                field.onChange(formatted);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={formPF.control}
                      name="celular"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Celular</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="(00) 00000-0000"
                              {...field}
                              onChange={(e) => {
                                const formatted = formatPhone(
                                  e.target.value,
                                );
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
                      control={formPF.control}
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
                                onBlur={() => buscarCep(field.value ?? '', formPF)}
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
                      control={formPF.control}
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
                      control={formPF.control}
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
                      control={formPF.control}
                      name="complemento"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Complemento</FormLabel>
                          <FormControl>
                            <Input placeholder="Apto, Bloco..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={formPF.control}
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
                      control={formPF.control}
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
                      control={formPF.control}
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
                    disabled={criarCliente.isPending}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={criarCliente.isPending}>
                    {criarCliente.isPending
                      ? 'Cadastrando...'
                      : 'Cadastrar Cliente'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </TabsContent>

          {/* Form Pessoa Jurídica */}
          <TabsContent value="PJ" className="space-y-4 mt-4">
            <Form {...formPJ}>
              <form
                onSubmit={formPJ.handleSubmit(handleSubmit)}
                className="space-y-6"
              >
                {/* Dados Empresariais */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Dados Empresariais
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={formPJ.control}
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
                      control={formPJ.control}
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
                      control={formPJ.control}
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
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={formPJ.control}
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
                      control={formPJ.control}
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
                  </div>
                </div>

                {/* Contato */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Contato
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={formPJ.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Email *</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="contato@empresa.com"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={formPJ.control}
                      name="telefone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefone *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="(00) 0000-0000"
                              {...field}
                              onChange={(e) => {
                                const formatted = formatPhone(
                                  e.target.value,
                                );
                                field.onChange(formatted);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={formPJ.control}
                      name="celular"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Celular</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="(00) 00000-0000"
                              {...field}
                              onChange={(e) => {
                                const formatted = formatPhone(
                                  e.target.value,
                                );
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
                      control={formPJ.control}
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
                                onBlur={() => buscarCep(field.value ?? '', formPJ)}
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
                      control={formPJ.control}
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
                      control={formPJ.control}
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
                      control={formPJ.control}
                      name="complemento"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Complemento</FormLabel>
                          <FormControl>
                            <Input placeholder="Sala, Andar..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={formPJ.control}
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
                      control={formPJ.control}
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
                      control={formPJ.control}
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
                    disabled={criarCliente.isPending}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={criarCliente.isPending}>
                    {criarCliente.isPending
                      ? 'Cadastrando...'
                      : 'Cadastrar Cliente'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
