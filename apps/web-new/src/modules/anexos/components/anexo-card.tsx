
import { useState } from 'react';
import { dayjs } from '@/core/utils/date-utils';
import {
  FileText,
  Image as ImageIcon,
  File,
  Download,
  Trash2,
  Eye,
  MoreVertical,
  History,
} from 'lucide-react';
import { Card } from '@/core/ui/card';
import { Button } from '@/core/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/core/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/core/ui/alert-dialog';
import { Badge } from '@/core/ui/badge';
import {
  useDeleteAnexo,
  getDownloadUrl,
  type Anexo,
} from '../http';
import { AnexoPreview } from './anexo-preview';
import { AnexoVersoes } from './anexo-versoes';
import { toast } from 'sonner';
import { handleApiError } from '@/core/utils/handle-api-error';

interface AnexoCardProps {
  anexo: Anexo;
  contextEntidade?: string;
  readOnly?: boolean;
}

export function AnexoCard({ anexo, contextEntidade, readOnly }: AnexoCardProps) {
  const isExternal = !!contextEntidade && anexo.entidadeTipo !== contextEntidade;
  const [showPreview, setShowPreview] = useState(false);
  const [showVersoes, setShowVersoes] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const deleteMutation = useDeleteAnexo();

  const handleDownload = async () => {
    const url = await getDownloadUrl(anexo.id);
    window.open(url, '_blank');
  };

  const handleDelete = () => {
    deleteMutation.mutate(anexo.id, {
      onSuccess: () => {
        toast.success('Anexo excluído com sucesso');
        setShowDeleteDialog(false);
      },
      onError: (error: unknown) => {
        toast.error(handleApiError(error));
      },
    });
  };

  const getFileIcon = () => {
    if (anexo.mimeType.startsWith('image/')) return ImageIcon;
    if (anexo.mimeType === 'application/pdf') return FileText;
    return File;
  };

  const Icon = getFileIcon();

  return (
    <>
      <Card className="p-4 hover:shadow-md transition-shadow">
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Icon className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium truncate">
                {anexo.nomeOriginal}
              </h4>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(anexo.tamanho)}
                </p>
                {isExternal && (
                  <Badge variant="secondary" className="text-xs px-1.5 py-0">
                    Da apólice
                  </Badge>
                )}
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowPreview(true)}>
                  <Eye className="h-4 w-4 mr-2" />
                  Visualizar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Baixar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowVersoes(true)}>
                  <History className="h-4 w-4 mr-2" />
                  Versões
                </DropdownMenuItem>
                {!isExternal && !readOnly && (
                  <DropdownMenuItem
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              v{anexo.versao} •{' '}
              {dayjs(anexo.uploadEm).fromNow()}
            </span>
          </div>
        </div>
      </Card>

      <AnexoPreview
        anexo={anexo}
        open={showPreview}
        onOpenChange={setShowPreview}
      />

      <AnexoVersoes
        anexoId={anexo.id}
        open={showVersoes}
        onOpenChange={setShowVersoes}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir anexo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o arquivo "{anexo.nomeOriginal}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteMutation.isPending}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
