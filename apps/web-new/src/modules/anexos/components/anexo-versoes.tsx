
import { useState } from 'react';
import { dayjs } from '@/core/utils/date-utils';
import { Download, Upload, Loader2, CheckCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/core/ui/dialog';
import { Button } from '@/core/ui/button';
import { Card } from '@/core/ui/card';
import { Badge } from '@/core/ui/badge';
import {
  useAnexoVersoes,
  useUploadNovaVersao,
  getDownloadUrl,
  type Anexo,
} from '../http';
import { toast } from 'sonner';
import { handleApiError } from '@/core/utils/handle-api-error';

interface AnexoVersoesProps {
  anexoId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AnexoVersoes({
  anexoId,
  open,
  onOpenChange,
}: AnexoVersoesProps) {
  const { data: versoes, isLoading } = useAnexoVersoes(anexoId);
  const uploadMutation = useUploadNovaVersao();
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await uploadMutation.mutateAsync({
        anexoId,
        arquivo: file,
        onProgress: setUploadProgress,
      });

      toast.success('Nova versão enviada com sucesso');
      setUploadProgress(0);
    } catch (error) {
      toast.error(handleApiError(error));
      setUploadProgress(0);
    }
  };

  const handleDownload = async (id: string) => {
    const url = await getDownloadUrl(id);
    window.open(url, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Histórico de Versões</DialogTitle>
            <div className="relative">
              <input
                type="file"
                onChange={handleFileSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={uploadMutation.isPending}
              />
              <Button size="sm" disabled={uploadMutation.isPending}>
                <Upload className="h-4 w-4 mr-2" />
                Nova versão
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {uploadMutation.isPending && (
            <Card className="p-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    Enviando nova versão...
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {uploadProgress}%
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            </Card>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : versoes && versoes.length > 0 ? (
            versoes.map((versao: Anexo) => (
              <Card key={versao.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">v{versao.versao}</span>
                      {versao.versaoAtual && (
                        <Badge variant="default" className="text-xs">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Atual
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {versao.nomeOriginal}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(versao.tamanho)} •{' '}
                      {dayjs(versao.uploadEm).fromNow()}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(versao.id)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">
                Nenhuma versão encontrada
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
