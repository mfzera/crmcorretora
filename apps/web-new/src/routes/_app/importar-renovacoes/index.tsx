import { createFileRoute } from '@tanstack/react-router';

import { useState, startTransition } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  Upload,
  FileSpreadsheet,
  AlertCircle,
  Loader2,
  Download,
  History,
  Check,
  ChevronsUpDown,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/core/ui/card';
import { Button } from '@/core/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/core/ui/alert';
import { Badge } from '@/core/ui/badge';
import { Label } from '@/core/ui/label';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/core/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/core/ui/popover';
import { cn } from '@/core/utils';
import { useImportarRenovacoes } from '@/modules/renovacoes/http';
import { useVendedores } from '@/modules/usuarios/http';
import { PageGuard } from '@/modules/auth/components/page-guard';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

export const Route = createFileRoute('/_app/importar-renovacoes/')({
  component: ImportarRenovacoesPage,
});


function ImportarRenovacoesPage() {
  return (
    <PageGuard permission="importar_renovacoes:acessar">
      <ImportarRenovacoesPageContent />
    </PageGuard>
  );
}

function ImportarRenovacoesPageContent() {
  const navigate = useNavigate();
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [vendedorId, setVendedorId] = useState<string>('');
  const [vendedorSearch, setVendedorSearch] = useState('');
  const [vendedorPopoverOpen, setVendedorPopoverOpen] = useState(false);
  const importarMutation = useImportarRenovacoes();

  const { data: vendedoresData, isLoading: isLoadingUsuarios } = useVendedores();
  const vendedores = vendedoresData || [];

  const processFile = (file: File) => {
    const extensao = file.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(extensao || '')) {
      toast.error('Selecione um arquivo Excel (.xlsx, .xls) ou CSV (.csv)');
      return;
    }
    setArquivo(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) startTransition(() => processFile(e.target.files![0]));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDraggingOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files[0];
    if (file) startTransition(() => processFile(file));
  };

  const handleDownloadModelo = () => {
    const dadosExemplo = [
      {
        'VIGÊNCIA FINAL': '31/12/2026',
        'TIPO DE PESSOA': 'FÍSICA',
        'E-MAIL': 'cliente@exemplo.com.br',
        TELEFONE: '11 98765-4321',
        CLIENTE: 'João da Silva',
        'DOCUMENTO DO CLIENTE': '123.456.789-00',
        ITEM: 'HONDA CIVIC EXL 2.0 / ABC1D23 / Placa: ABC-1234',
        PRODUTO: 'AUTOMÓVEL',
        SEGURADORA: 'Porto Seguro',
        'TODOS VENDEDORES': 'Maria Vendedora',
        'PRÊMIO LÍQUIDO': '2500.00',
        COMISSÃO: '15%',
        STATUS: 'ATIVO',
      },
      {
        'VIGÊNCIA FINAL': '15/01/2027',
        'TIPO DE PESSOA': 'JURÍDICA',
        'E-MAIL': 'contato@empresa.com.br',
        TELEFONE: '11 3333-4444',
        CLIENTE: 'Empresa Exemplo LTDA',
        'DOCUMENTO DO CLIENTE': '12.345.678/0001-90',
        ITEM: 'TOYOTA COROLLA XEI / XYZ9W88 / Placa: XYZ-9876',
        PRODUTO: 'AUTOMÓVEL',
        SEGURADORA: 'Liberty Seguros',
        'TODOS VENDEDORES': 'João Vendedor',
        'PRÊMIO LÍQUIDO': '3200.00',
        COMISSÃO: '12%',
        STATUS: 'ATIVO',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(dadosExemplo);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Renovações');
    ws['!cols'] = [
      { wch: 15 }, { wch: 15 }, { wch: 30 }, { wch: 18 },
      { wch: 30 }, { wch: 20 }, { wch: 50 }, { wch: 15 },
      { wch: 20 }, { wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 12 },
    ];
    XLSX.writeFile(wb, 'modelo-importacao-renovacoes.xlsx');
  };

  const handleImportar = async () => {
    if (!arquivo) {
      toast.error('Selecione um arquivo para importar');
      return;
    }
    if (!vendedorId) {
      toast.error('Selecione um vendedor responsável');
      return;
    }

    const formData = new FormData();
    formData.append('vendedorId', vendedorId);
    formData.append('file', arquivo);

    importarMutation.mutate(formData, {
      onSuccess: (data) => {
        toast.success(`Importação concluída: ${data.sucesso} sucesso, ${data.erros} erros`);
        navigate({ to: `/importar-renovacoes/${data.importacaoId}` });
      },
      onError: (error: any) => {
        toast.error(error.message || 'Erro ao importar', {
          duration: Infinity,
          closeButton: true,
        });
      },
    });
  };

  return (
    <div className="container mx-auto py-4 sm:py-8 px-3 sm:px-4 max-w-4xl">
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold">Importar Renovações</h1>
          <p className="text-xs sm:text-base text-muted-foreground mt-1 sm:mt-2">
            Faça upload de uma planilha Excel para importar renovações em lote
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate({ to: '/importar-renovacoes/historico' })}
          className="w-full sm:w-auto"
        >
          <History className="h-4 w-4 mr-2" />
          Ver Histórico
        </Button>
      </div>

      {/* Formato da Planilha */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Formato da Planilha
          </CardTitle>
          <CardDescription>
            A planilha deve conter as seguintes colunas (em qualquer ordem):
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              ['VIGÊNCIA FINAL', 'Data de vencimento da apólice'],
              ['TIPO DE PESSOA', 'FÍSICA ou JURÍDICA'],
              ['DOCUMENTO DO CLIENTE', 'CPF ou CNPJ do cliente (obrigatório)'],
              ['CLIENTE', 'Nome do cliente'],
              ['ITEM', 'Descrição do item segurado'],
              ['PRODUTO', 'Tipo de produto'],
              ['TODOS VENDEDORES', 'Nome do(s) vendedor(es)'],
              ['STATUS', 'Status atual da renovação'],
            ].map(([col, desc]) => (
              <div key={col}>
                <Badge variant="outline">{col}</Badge>
                <p className="text-sm text-muted-foreground mt-1">{desc}</p>
              </div>
            ))}
          </div>

          <Alert className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Importante</AlertTitle>
            <AlertDescription>
              O sistema irá buscar documentos ATIVOS dos clientes com base no
              CPF/CNPJ informado. Se já existir uma renovação para o documento,
              ela será pulada.
            </AlertDescription>
          </Alert>

          <div className="mt-4">
            <Button onClick={handleDownloadModelo} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Baixar Modelo de Planilha
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Upload */}
      <Card>
        <CardHeader>
          <CardTitle>Upload da Planilha</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            {/* Dropzone */}
            <div
              className={`border-2 border-dashed rounded-lg p-10 text-center transition-colors ${
                isDraggingOver
                  ? 'border-primary bg-primary/5'
                  : arquivo
                    ? 'border-green-400 bg-green-50 dark:bg-green-950/20'
                    : 'border-muted-foreground/25 hover:border-muted-foreground/50'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {arquivo ? (
                <>
                  <FileSpreadsheet className="h-10 w-10 mx-auto mb-3 text-green-600 dark:text-green-400" />
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <span className="font-medium">{arquivo.name}</span>
                    <Badge variant="secondary">
                      {(arquivo.size / 1024).toFixed(1)} KB
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Arquivo selecionado com sucesso
                  </p>
                </>
              ) : (
                <>
                  <Upload
                    className={`h-10 w-10 mx-auto mb-3 transition-colors ${
                      isDraggingOver ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  />
                  <p className="font-medium mb-1">
                    {isDraggingOver
                      ? 'Solte o arquivo aqui'
                      : 'Arraste e solte a planilha aqui'}
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Suporta .xlsx, .xls e .csv
                  </p>
                </>
              )}
              <Button variant="outline" asChild size="sm">
                <label htmlFor="file-upload" className="cursor-pointer">
                  {arquivo ? 'Trocar arquivo' : 'Ou clique para selecionar'}
                  <input
                    id="file-upload"
                    type="file"
                    className="hidden"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileChange}
                  />
                </label>
              </Button>
            </div>

            {/* Vendedor */}
            {arquivo && (
              <div className="space-y-2">
                <Label htmlFor="vendedor" className="text-base font-semibold">
                  Vendedor Responsável <span className="text-red-500">*</span>
                </Label>
                <Popover
                  open={vendedorPopoverOpen}
                  onOpenChange={setVendedorPopoverOpen}
                  modal
                >
                  <PopoverTrigger asChild>
                    <Button
                      id="vendedor"
                      variant="outline"
                      role="combobox"
                      disabled={isLoadingUsuarios}
                      className={cn(
                        'w-full justify-between',
                        !vendedorId && 'text-muted-foreground',
                      )}
                    >
                      <span className="truncate text-left flex-1 min-w-0">
                        {isLoadingUsuarios
                          ? 'Carregando vendedores...'
                          : vendedorId
                            ? vendedores.find((v) => v.id === vendedorId)?.nome ?? 'Vendedor selecionado'
                            : 'Selecione o vendedor responsável'}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[90vw] sm:w-[400px] max-w-md p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Buscar vendedor..."
                        value={vendedorSearch}
                        onValueChange={setVendedorSearch}
                      />
                      <CommandList>
                        <CommandEmpty>Nenhum vendedor encontrado</CommandEmpty>
                        <CommandGroup>
                          {vendedores
                            .filter((v) =>
                              v.nome
                                .toLowerCase()
                                .includes(vendedorSearch.toLowerCase()),
                            )
                            .map((vendedor) => (
                              <CommandItem
                                key={vendedor.id}
                                value={vendedor.id}
                                onSelect={() => {
                                  setVendedorId(vendedor.id);
                                  setVendedorPopoverOpen(false);
                                  setVendedorSearch('');
                                }}
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    vendedor.id === vendedorId
                                      ? 'opacity-100'
                                      : 'opacity-0',
                                  )}
                                />
                                {vendedor.nome}
                              </CommandItem>
                            ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <p className="text-sm text-muted-foreground">
                  Este vendedor será atribuído a todas as renovações importadas
                </p>
              </div>
            )}

            {/* Ações */}
            {arquivo && (
              <div className="flex flex-col-reverse sm:flex-row gap-2">
                <Button
                  onClick={() => {
                    setArquivo(null);
                    setVendedorId('');
                    importarMutation.reset();
                  }}
                  variant="outline"
                  disabled={importarMutation.isPending}
                  className="w-full sm:w-auto"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleImportar}
                  disabled={importarMutation.isPending || !vendedorId}
                  className="flex-1"
                >
                  {importarMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Importando...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Importar Renovações
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
