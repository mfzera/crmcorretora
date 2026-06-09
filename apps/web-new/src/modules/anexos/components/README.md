# Componentes de Anexos

Sistema completo de gerenciamento de anexos para o EcoTech System.

## Componentes Disponíveis

### AnexoUploader
Componente drag-and-drop para upload de arquivos.

### AnexoList
Lista todos os anexos de uma entidade (cotação, documento de venda, renovação).

### AnexoCard
Card individual de anexo com ações (preview, download, versões, excluir).

### StorageIndicator
Indicador visual do uso de armazenamento com alertas de limite.

### AnexoPreview
Dialog para visualização de imagens e PDFs.

### AnexoVersoes
Dialog para gerenciar histórico de versões de um anexo.

## Exemplo de Uso

```tsx
'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AnexoUploader,
  AnexoList,
  StorageIndicator,
} from '@/components/anexos';

export default function CotacaoDetalhesPage({ params }: { params: { id: string } }) {
  const cotacaoId = params.id;

  return (
    <div className="container mx-auto py-6">
      <Tabs defaultValue="detalhes">
        <TabsList>
          <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
          <TabsTrigger value="anexos">Anexos</TabsTrigger>
        </TabsList>

        <TabsContent value="detalhes">
          {/* Conteúdo de detalhes da cotação */}
        </TabsContent>

        <TabsContent value="anexos">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Área principal - Upload e Lista */}
            <div className="lg:col-span-2 space-y-6">
              {/* Upload */}
              <Card>
                <CardHeader>
                  <CardTitle>Upload de Arquivos</CardTitle>
                </CardHeader>
                <CardContent>
                  <AnexoUploader
                    entidadeTipo="cotacao"
                    entidadeId={cotacaoId}
                  />
                </CardContent>
              </Card>

              {/* Lista de Anexos */}
              <Card>
                <CardHeader>
                  <CardTitle>Arquivos Anexados</CardTitle>
                </CardHeader>
                <CardContent>
                  <AnexoList
                    entidadeTipo="cotacao"
                    entidadeId={cotacaoId}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Sidebar - Informações */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Armazenamento</CardTitle>
                </CardHeader>
                <CardContent>
                  <StorageIndicator />
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

## React Query Hooks

Os hooks estão disponíveis em `@/lib/queries/anexos`:

### Queries
- `useAnexos(entidadeTipo, entidadeId)` - Lista anexos
- `useAnexo(entidadeTipo, entidadeId, anexoId)` - Detalhes de um anexo
- `useAnexoVersoes(entidadeTipo, entidadeId, anexoId)` - Histórico de versões
- `useStorageUsage()` - Uso de armazenamento

### Mutations
- `useUploadAnexo()` - Upload de novo anexo
- `useUploadNovaVersao()` - Upload de nova versão
- `useDeleteAnexo()` - Excluir anexo

### Helper Functions
- `getDownloadUrl(entidadeTipo, entidadeId, anexoId)` - Obter URL de download

## Tipos de Arquivo Suportados

- PDF (`.pdf`)
- Imagens (`.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`)
- Word (`.docx`)
- Excel (`.xlsx`)
- CSV (`.csv`)

**Tamanho máximo:** 50MB por arquivo

## Features

- ✅ Drag & drop de arquivos
- ✅ Múltiplos uploads simultâneos
- ✅ Barra de progresso individual
- ✅ Preview de imagens e PDFs
- ✅ Histórico de versões
- ✅ Download de arquivos
- ✅ Indicador de uso de armazenamento
- ✅ Validação de tipos e tamanhos
- ✅ Confirmação de exclusão
- ✅ Feedback visual (loading, error, success)
- ✅ Responsivo (mobile-first)

## Estrutura de Arquivos

```
apps/web/src/
├── lib/
│   └── queries/
│       └── anexos.ts              # React Query hooks
├── hooks/
│   └── use-file-upload.ts         # Hook de upload com drag-drop
└── components/
    └── anexos/
        ├── anexo-uploader.tsx     # Componente de upload
        ├── anexo-list.tsx         # Lista de anexos
        ├── anexo-card.tsx         # Card individual
        ├── storage-indicator.tsx  # Indicador de storage
        ├── anexo-preview.tsx      # Preview de arquivos
        ├── anexo-versoes.tsx      # Histórico de versões
        └── index.ts               # Exports
```

## Dependências

- `react-dropzone` - Drag & drop
- `@tanstack/react-query` - State management
- `date-fns` - Formatação de datas
- `lucide-react` - Ícones
- `sonner` - Toasts/Notificações
- `@radix-ui/*` - Componentes UI base
