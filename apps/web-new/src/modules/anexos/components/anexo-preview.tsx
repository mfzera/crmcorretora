
import { useState, useEffect, useRef } from 'react';
import { Download, Loader2, ExternalLink, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/core/ui/dialog';
import { Button } from '@/core/ui/button';
import { getDownloadUrl, type Anexo } from '../http';

interface AnexoPreviewProps {
  anexo: Anexo;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AnexoPreview({ anexo, open, onOpenChange }: AnexoPreviewProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [corrompido, setCorrempido] = useState(false);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (open) {
      loadUrl();
    } else {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
      setBlobUrl(null);
      setSignedUrl(null);
      setLoading(true);
      setCorrempido(false);
    }
  }, [open, anexo.id]);

  const loadUrl = async () => {
    try {
      setLoading(true);
      setCorrempido(false);
      const downloadUrl = await getDownloadUrl(anexo.id);

      if (!downloadUrl) {
        setCorrempido(true);
        return;
      }

      // Set immediately so fallback is always available even if blob fetch fails
      setSignedUrl(downloadUrl);

      // Try to fetch as blob to bypass X-Frame-Options; on CORS failure fall back to signedUrl
      try {
        const response = await fetch(downloadUrl);
        if (response.ok) {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          blobUrlRef.current = url;
          setBlobUrl(url);
        }
      } catch {
        // CORS or network error — signedUrl already set, preview will use it directly
      }
    } catch {
      setCorrempido(true);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    const url = signedUrl;
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = anexo.nomeOriginal;
    a.click();
  };

  const handleOpenFullscreen = () => {
    const url = blobUrl ?? signedUrl;
    if (url) window.open(url, '_blank', 'width=1200,height=800');
  };

  const renderPreview = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (corrompido) {
      return (
        <div className="flex flex-col items-center justify-center h-96 gap-4 text-center px-8">
          <div className="rounded-full bg-destructive/10 p-4">
            <AlertTriangle className="h-10 w-10 text-destructive" />
          </div>
          <div className="space-y-2 max-w-sm">
            <p className="font-semibold text-destructive text-lg">
              Arquivo indisponível
            </p>
            <p className="text-sm text-muted-foreground">
              Este arquivo não foi encontrado no armazenamento — provavelmente
              houve uma falha durante o envio original.
            </p>
            <p className="text-sm font-medium mt-2">
              Recuse o documento e solicite ao usuário que anexe o arquivo novamente.
            </p>
          </div>
        </div>
      );
    }

    const previewUrl = blobUrl ?? signedUrl;

    if (!previewUrl) {
      return (
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">
            Não foi possível carregar o preview
          </p>
        </div>
      );
    }

    // Preview de imagens
    if (anexo.mimeType.startsWith('image/')) {
      return (
        <div className="flex items-center justify-center bg-muted/50 rounded-lg p-4 min-h-[60vh]">
          <img
            src={previewUrl}
            alt={anexo.nomeOriginal}
            className="max-w-full max-h-[75vh] object-contain"
          />
        </div>
      );
    }

    // Preview de PDF
    if (anexo.mimeType === 'application/pdf') {
      return (
        <iframe
          src={previewUrl}
          className="w-full h-[75vh] rounded-lg border"
          title={anexo.nomeOriginal}
        />
      );
    }

    // Outros tipos - mostrar mensagem
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <p className="text-muted-foreground">
          Preview não disponível para este tipo de arquivo
        </p>
        <Button onClick={handleDownload}>
          <Download className="h-4 w-4 mr-2" />
          Baixar arquivo
        </Button>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[90vw] sm:!max-w-[90vw] md:!max-w-[90vw] lg:!max-w-[90vw] w-full max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="truncate pr-4">
              {anexo.nomeOriginal}
            </DialogTitle>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenFullscreen}
                disabled={!signedUrl}
                title="Abrir em nova janela"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                disabled={!signedUrl}
                title="Baixar arquivo"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        <div className="overflow-auto max-h-[calc(90vh-120px)]">
          {renderPreview()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
