import { createFileRoute } from '@tanstack/react-router';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from '@tanstack/react-router';
import { AdminGuard } from '@/modules/admin/components/admin-guard';
import {
  treinamentosApi,
  type Modulo,
  type Aula,
  type Quiz,
  type CursoDetalhado,
} from '@/infra/http/treinamentos-api';
import { cn } from '@/core/utils';
import { Button } from '@/core/ui/button';
import { Input } from '@/core/ui/input';
import { Label } from '@/core/ui/label';
import { Textarea } from '@/core/ui/textarea';
import { Badge } from '@/core/ui/badge';
import { Skeleton } from '@/core/ui/skeleton';
import { Progress } from '@/core/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/core/ui/dialog';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/core/ui/collapsible';
import { toast } from 'sonner';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {

  ArrowLeft,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Video,
  Pencil,
  GripVertical,
  ImagePlus,
  Upload,
  Loader2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

export const Route = createFileRoute('/_admin/admin/treinamentos/$cursoId')({
  component: CursoDetalhe,
});

// ─── Quiz Dialog ──────────────────────────────────────────────────────────────

interface AlternativaForm { texto: string; correta: boolean }
interface PerguntaForm { enunciado: string; alternativas: AlternativaForm[] }

const emptyAlternativa = (): AlternativaForm => ({ texto: '', correta: false });
const emptyPergunta = (): PerguntaForm => ({
  enunciado: '',
  alternativas: [emptyAlternativa(), emptyAlternativa(), emptyAlternativa(), emptyAlternativa()],
});

interface QuizDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  aulaId: string;
  existing: Quiz | null;
  onSuccess: () => void;
}

function QuizDialog({ open, onOpenChange, aulaId, existing, onSuccess }: QuizDialogProps) {
  const [titulo, setTitulo] = useState(existing?.titulo ?? '');
  const [perguntas, setPerguntas] = useState<PerguntaForm[]>(() =>
    existing?.perguntas?.length
      ? existing.perguntas.map((p) => ({
          enunciado: p.enunciado,
          alternativas: p.alternativas.length
            ? p.alternativas.map((a) => ({ texto: a.texto, correta: a.correta }))
            : [emptyAlternativa(), emptyAlternativa(), emptyAlternativa(), emptyAlternativa()],
        }))
      : [emptyPergunta()]
  );

  const updateEnunciado = (pi: number, val: string) =>
    setPerguntas((prev) => prev.map((p, i) => i === pi ? { ...p, enunciado: val } : p));

  const updateAlt = (pi: number, ai: number, val: string) =>
    setPerguntas((prev) => prev.map((p, i) =>
      i !== pi ? p : { ...p, alternativas: p.alternativas.map((a, j) => j === ai ? { ...a, texto: val } : a) }
    ));

  const setCorreta = (pi: number, ai: number) =>
    setPerguntas((prev) => prev.map((p, i) =>
      i !== pi ? p : { ...p, alternativas: p.alternativas.map((a, j) => ({ ...a, correta: j === ai })) }
    ));

  const addPergunta = () => setPerguntas((p) => [...p, emptyPergunta()]);
  const removePergunta = (pi: number) => setPerguntas((p) => p.filter((_, i) => i !== pi));

  const isValid = titulo.trim().length > 0 && perguntas.length > 0 && perguntas.every((p) =>
    p.enunciado.trim() &&
    p.alternativas.some((a) => a.correta) &&
    p.alternativas.every((a) => a.texto.trim())
  );

  const mutation = useMutation({
    mutationFn: async () => {
      if (existing) await treinamentosApi.deleteQuiz(existing.id);
      return treinamentosApi.createQuiz({
        aulaId,
        titulo,
        perguntasList: perguntas.map((p, i) => ({
          enunciado: p.enunciado,
          ordem: i,
          alternativas: p.alternativas.map((a, j) => ({ texto: a.texto, correta: a.correta, ordem: j })),
        })),
      });
    },
    onSuccess: () => {
      toast.success(existing ? 'Quiz atualizado' : 'Quiz criado');
      onSuccess();
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error('Erro', { description: err.message }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{existing ? 'Editar Quiz' : 'Novo Quiz'}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-5 pr-1">
          <div className="space-y-2">
            <Label>Título do Quiz *</Label>
            <Input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Quiz sobre a aula"
            />
          </div>

          {perguntas.map((perg, pi) => (
            <div key={pi} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Pergunta {pi + 1}</span>
                {perguntas.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => removePergunta(pi)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              <Textarea
                value={perg.enunciado}
                onChange={(e) => updateEnunciado(pi, e.target.value)}
                placeholder="Enunciado da pergunta"
                rows={2}
              />
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Marque a alternativa correta</p>
                {perg.alternativas.map((alt, ai) => (
                  <div key={ai} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCorreta(pi, ai)}
                      className={cn(
                        'h-5 w-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors',
                        alt.correta
                          ? 'border-green-500 bg-green-500'
                          : 'border-muted-foreground hover:border-foreground'
                      )}
                    >
                      {alt.correta && <div className="h-2 w-2 rounded-full bg-white" />}
                    </button>
                    <Input
                      value={alt.texto}
                      onChange={(e) => updateAlt(pi, ai, e.target.value)}
                      placeholder={`Alternativa ${String.fromCharCode(65 + ai)}`}
                      className="flex-1"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}

          <Button type="button" variant="outline" className="w-full" onClick={addPergunta}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Pergunta
          </Button>
        </div>

        <DialogFooter className="pt-4 border-t mt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={!isValid || mutation.isPending}>
            {mutation.isPending ? 'Salvando...' : existing ? 'Salvar alterações' : 'Criar Quiz'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Módulo Dialog ────────────────────────────────────────────────────────────

interface ModuloDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  cursoId: string;
  modulo?: Modulo | null;
  onSuccess: () => void;
}

function ModuloDialog({ open, onOpenChange, cursoId, modulo, onSuccess }: ModuloDialogProps) {
  const [titulo, setTitulo] = useState(modulo?.titulo ?? '');
  const isEdit = !!modulo;

  const mutation = useMutation({
    mutationFn: () =>
      isEdit
        ? treinamentosApi.updateModulo({ id: modulo!.id, titulo })
        : treinamentosApi.createModulo({ cursoId, titulo }),
    onSuccess: () => {
      toast.success(isEdit ? 'Módulo atualizado' : 'Módulo criado');
      onSuccess();
      onOpenChange(false);
    },
    onError: (error: Error) => toast.error('Erro', { description: error.message }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) return;
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Módulo' : 'Novo Módulo'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="modulo-titulo">Título *</Label>
            <Input
              id="modulo-titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Nome do módulo"
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Aula Dialog ──────────────────────────────────────────────────────────────

type VideoUploadState =
  | { step: 'idle' }
  | { step: 'uploading'; progress: number }
  | { step: 'transcoding'; progress: number }
  | { step: 'done' }
  | { step: 'error'; message: string };

interface AulaDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  moduloId: string;
  aula?: Aula | null;
  onSuccess: (createdAula?: Aula) => void;
}

function AulaDialog({ open, onOpenChange, moduloId, aula, onSuccess }: AulaDialogProps) {
  const [form, setForm] = useState({
    titulo: aula?.titulo ?? '',
    descricao: aula?.descricao ?? '',
    duracao: aula?.duracao ?? 0,
    ordem: aula?.ordem ?? 0,
    publicada: aula?.publicada ?? false,
    thumbnailUrl: aula?.thumbnailUrl ?? null as string | null,
  });
  const isEdit = !!aula;

  const [videoState, setVideoState] = useState<VideoUploadState>({ step: 'idle' });
  const [displayProgress, setDisplayProgress] = useState(0);
  const [eta, setEta] = useState<string | null>(null);
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [quizDialogOpen, setQuizDialogOpen] = useState(false);
  const [deletingQuiz, setDeletingQuiz] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const rafRef = useRef<number | null>(null);
  const targetProgressRef = useRef(0);
  const transcodeStartRef = useRef<number | null>(null);

  const { data: quiz, refetch: refetchQuiz } = useQuery({
    queryKey: ['quiz', aula?.id],
    queryFn: () => treinamentosApi.getQuiz(aula!.id),
    enabled: isEdit && open,
  });

  const deleteQuizMutation = useMutation({
    mutationFn: () => treinamentosApi.deleteQuiz(quiz!.id),
    onSuccess: () => {
      toast.success('Quiz removido');
      setDeletingQuiz(false);
      refetchQuiz();
    },
    onError: (err: Error) => toast.error('Erro', { description: err.message }),
  });

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Sync target progress ref and ETA
  useEffect(() => {
    if (videoState.step === 'transcoding') {
      if (transcodeStartRef.current === null) transcodeStartRef.current = Date.now();
      targetProgressRef.current = videoState.progress;

      const elapsed = (Date.now() - transcodeStartRef.current) / 1000;
      const p = videoState.progress;
      if (p > 2 && elapsed > 2) {
        const totalEstimated = elapsed / (p / 100);
        const remaining = Math.max(0, Math.round(totalEstimated - elapsed));
        if (remaining >= 60) {
          const m = Math.floor(remaining / 60);
          const s = remaining % 60;
          setEta(`~${m}min ${s > 0 ? `${s}s` : ''} restantes`);
        } else {
          setEta(`~${remaining}s restantes`);
        }
      }
    } else if (videoState.step === 'uploading') {
      targetProgressRef.current = videoState.progress;
    } else if (videoState.step === 'done') {
      targetProgressRef.current = 100;
      setEta(null);
      transcodeStartRef.current = null;
    } else if (videoState.step === 'idle' || videoState.step === 'error') {
      targetProgressRef.current = 0;
      setDisplayProgress(0);
      setEta(null);
      transcodeStartRef.current = null;
    }
  }, [videoState]);

  // Smooth animation toward target progress
  useEffect(() => {
    const isAnimating = videoState.step === 'uploading' || videoState.step === 'transcoding' ||
      (videoState.step === 'done' && displayProgress < 100);
    if (!isAnimating) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }
    const tick = () => {
      setDisplayProgress((prev) => {
        const target = targetProgressRef.current;
        const diff = target - prev;
        if (Math.abs(diff) < 0.2) return target;
        return prev + diff * 0.06;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoState.step]);

  const mutation = useMutation({
    mutationFn: () => {
      if (isEdit) return treinamentosApi.updateAula({ id: aula!.id, ...form });
      const { thumbnailUrl, ...rest } = form;
      return treinamentosApi.createAula({
        moduloId,
        ...rest,
        ...(thumbnailUrl !== null ? { thumbnailUrl } : {}),
      });
    },
    onSuccess: (result) => {
      toast.success(isEdit ? 'Aula atualizada' : 'Aula criada');
      onSuccess(isEdit ? undefined : (result as Aula));
      onOpenChange(false);
    },
    onError: (error: Error) => toast.error('Erro', { description: error.message }),
  });

  const handleThumbnail = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingThumb(true);
    try {
      const { url } = await treinamentosApi.uploadImagem(file, 'thumbnails');
      setForm((f) => ({ ...f, thumbnailUrl: url }));
      if (isEdit) {
        await treinamentosApi.updateAula({ id: aula!.id, thumbnailUrl: url });
      }
    } catch (err: unknown) {
      toast.error('Erro ao enviar imagem', {
        description: err instanceof Error ? err.message : 'Tente novamente',
      });
    } finally {
      setUploadingThumb(false);
    }
  };

  const handleReprocessar = useCallback(async () => {
    if (!aula?.r2KeyBase) return;
    setVideoState({ step: 'transcoding', progress: 0 });
    try {
      const token = treinamentosApi.getTranscodeToken();
      const res = await fetch(treinamentosApi.getTranscodeUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ r2Key: aula.r2KeyBase, aulaId: aula.id }),
      });
      if (!res.ok) throw new Error(`Transcode retornou ${res.status}`);
      const { jobId } = await res.json() as { jobId: string };

      // Polling do progresso até concluir
      const poll = async () => {
        const job = await treinamentosApi.getTranscodeStatus({ jobId });
        if (!job) return;
        if (job.status === 'processing' || job.status === 'pending') {
          setVideoState({ step: 'transcoding', progress: job.progress });
          setTimeout(poll, 2000);
        } else if (job.status === 'done') {
          setVideoState({ step: 'done' });
          toast.success('Vídeo processado com sucesso');
          onSuccess();
        } else if (job.status === 'error') {
          setVideoState({ step: 'error', message: job.errorMessage ?? 'Erro no processamento' });
        }
      };
      poll();
    } catch (err) {
      setVideoState({ step: 'error', message: err instanceof Error ? err.message : 'Erro ao reprocessar' });
    }
  }, [aula, onSuccess]);

  const handleVideoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !aula) return;

    try {
      // 1. Presign
      setVideoState({ step: 'uploading', progress: 0 });
      const { uploadUrl, r2Key } = await treinamentosApi.presignVideo(file.type);

      // 2. Upload direto para URL presignada (R2 suporta CORS).
      //    Fallback para proxy same-origin se CORS bloquear (MinIO local).
      const doUpload = (url: string) =>
        new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('PUT', url);
          xhr.setRequestHeader('Content-Type', file.type);
          xhr.upload.onprogress = (ev) => {
            if (ev.lengthComputable) {
              setVideoState({ step: 'uploading', progress: Math.round((ev.loaded / ev.total) * 100) });
            }
          };
          xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload falhou (${xhr.status})`)));
          xhr.onerror = () => reject(new Error('cors'));
          xhr.send(file);
        });

      try {
        await doUpload(uploadUrl);
      } catch (err) {
        if (err instanceof Error && err.message === 'cors') {
          // Fallback: proxy local (sem progresso real)
          setVideoState({ step: 'uploading', progress: 0 });
          await doUpload(`/api/storage/proxy-upload?url=${encodeURIComponent(uploadUrl)}`);
        } else {
          throw err;
        }
      }

      // 3. Save r2KeyBase on the aula, then kick off transcode via POST SSE
      await treinamentosApi.updateAula({ id: aula.id, r2KeyBase: r2Key });
      setVideoState({ step: 'transcoding', progress: 0 });

      const token = treinamentosApi.getTranscodeToken();
      const transcodeUrl = treinamentosApi.getTranscodeUrl();

      try {
        abortRef.current?.abort();
        const ac = new AbortController();
        abortRef.current = ac;

        const res = await fetch(transcodeUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ r2Key, aulaId: aula.id }),
          signal: ac.signal,
        });

        if (!res.ok) throw new Error(`Transcode retornou ${res.status}`);
        if (!res.body) throw new Error('Sem stream de resposta');

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'progress') {
                setVideoState({ step: 'transcoding', progress: data.percent ?? 0 });
              } else if (data.type === 'done') {
                setVideoState({ step: 'done' });
                toast.success('Vídeo processado com sucesso');
                onSuccess();
              } else if (data.type === 'error') {
                setVideoState({ step: 'error', message: data.message ?? 'Erro no processamento' });
              }
            } catch { /* ignore parse errors */ }
          }
        }

        // Stream ended without done event — check final state
        if (videoState.step === 'transcoding') {
          setVideoState({ step: 'done' });
          toast.success('Vídeo processado');
          onSuccess();
        }
      } catch (err) {
        // Transcode service not available — video was uploaded, will process later
        const msg = err instanceof Error ? err.message : '';
        if (msg.includes('fetch') || msg.includes('NetworkError') || msg.includes('retornou')) {
          setVideoState({ step: 'done' });
          toast.success('Vídeo enviado — processamento será feito em segundo plano');
          onSuccess();
        } else {
          setVideoState({ step: 'error', message: msg || 'Erro no processamento' });
        }
      }
    } catch (err: unknown) {
      setVideoState({
        step: 'error',
        message: err instanceof Error ? err.message : 'Erro inesperado',
      });
    }
  }, [aula, onSuccess, videoState.step]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.titulo.trim()) return;
    mutation.mutate();
  };

  const isBusy = videoState.step === 'uploading' || videoState.step === 'transcoding';

  return (
    <>
    <Dialog open={open} onOpenChange={(v) => { if (!isBusy) onOpenChange(v); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Aula' : 'Nova Aula'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="aula-titulo">Título *</Label>
            <Input
              id="aula-titulo"
              value={form.titulo}
              onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
              placeholder="Nome da aula"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="aula-desc">Descrição</Label>
            <Textarea
              id="aula-desc"
              value={form.descricao}
              onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
              placeholder="Descrição da aula"
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="aula-duracao">Duração (segundos)</Label>
            <Input
              id="aula-duracao"
              type="number"
              value={form.duracao}
              onChange={(e) => setForm((f) => ({ ...f, duracao: Number(e.target.value) }))}
              placeholder="0"
            />
          </div>

          {/* Thumbnail (edit mode) */}
          {isEdit && (
            <div className="space-y-2">
              <Label>Thumbnail</Label>
              {form.thumbnailUrl ? (
                <div className="relative w-full max-w-[200px]">
                  <img
                    src={form.thumbnailUrl}
                    alt="Thumbnail"
                    className="rounded-md border object-cover w-full aspect-video"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="absolute bottom-2 right-2 text-xs"
                    disabled={uploadingThumb}
                    onClick={() => document.getElementById(`aula-thumb-${aula!.id}`)?.click()}
                  >
                    Alterar
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={uploadingThumb}
                  className="flex items-center gap-2 rounded-md border border-dashed px-4 py-4 w-full text-sm text-muted-foreground hover:bg-muted/40 transition-colors"
                  onClick={() => document.getElementById(`aula-thumb-${aula!.id}`)?.click()}
                >
                  <ImagePlus className="h-4 w-4" />
                  {uploadingThumb ? 'Enviando...' : 'Selecionar imagem'}
                </button>
              )}
              <input
                id={`aula-thumb-${aula!.id}`}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleThumbnail}
              />
            </div>
          )}

          {/* Video upload (edit mode) */}
          {isEdit && (
            <div className="space-y-2">
              <Label>Vídeo</Label>
              {aula!.hlsUrl && videoState.step === 'idle' ? (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Vídeo disponível</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="ml-auto text-xs"
                    onClick={() => document.getElementById(`aula-video-${aula!.id}`)?.click()}
                  >
                    Substituir
                  </Button>
                </div>
              ) : videoState.step === 'idle' && aula!.r2KeyBase && !aula!.hlsUrl ? (
                <div className="flex items-center gap-2 rounded-md border border-yellow-500/30 bg-yellow-500/5 px-4 py-3 text-sm text-yellow-600">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span className="flex-1">Vídeo enviado mas não processado</span>
                  <Button type="button" variant="outline" size="sm" className="text-xs" onClick={handleReprocessar}>
                    Reprocessar
                  </Button>
                </div>
              ) : videoState.step === 'idle' ? (
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-md border border-dashed px-4 py-4 w-full text-sm text-muted-foreground hover:bg-muted/40 transition-colors"
                  onClick={() => document.getElementById(`aula-video-${aula!.id}`)?.click()}
                >
                  <Upload className="h-4 w-4" />
                  Selecionar vídeo (.mp4, .mov, .webm)
                </button>
              ) : videoState.step === 'uploading' ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Enviando vídeo... {Math.round(displayProgress)}%</span>
                  </div>
                  <Progress value={displayProgress} />
                </div>
              ) : videoState.step === 'transcoding' ? (
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Processando... {Math.round(displayProgress)}%</span>
                    </div>
                    {eta && <span className="text-muted-foreground text-xs">{eta}</span>}
                  </div>
                  <Progress value={displayProgress} />
                </div>
              ) : videoState.step === 'done' ? (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Vídeo processado com sucesso</span>
                </div>
              ) : videoState.step === 'error' ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    <span>{videoState.message}</span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setVideoState({ step: 'idle' });
                      document.getElementById(`aula-video-${aula!.id}`)?.click();
                    }}
                  >
                    Tentar novamente
                  </Button>
                </div>
              ) : null}
              <input
                id={`aula-video-${aula!.id}`}
                type="file"
                accept="video/mp4,video/quicktime,video/webm"
                className="hidden"
                onChange={handleVideoUpload}
              />
            </div>
          )}

          {/* Quiz (edit mode) */}
          {isEdit && (
            <div className="space-y-2">
              <Label>Quiz</Label>
              {quiz === undefined ? (
                <div className="h-9 flex items-center">
                  <Skeleton className="h-5 w-40" />
                </div>
              ) : quiz ? (
                <div className="flex items-center gap-2 text-sm">
                  <HelpCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="font-medium truncate">{quiz.titulo}</span>
                  <span className="text-muted-foreground text-xs shrink-0">
                    {quiz.perguntas?.length ?? 0} {(quiz.perguntas?.length ?? 0) === 1 ? 'pergunta' : 'perguntas'}
                  </span>
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7 ml-auto" title="Editar quiz" onClick={() => setQuizDialogOpen(true)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" title="Remover quiz" onClick={() => setDeletingQuiz(true)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-md border border-dashed px-4 py-4 w-full text-sm text-muted-foreground hover:bg-muted/40 transition-colors"
                  onClick={() => setQuizDialogOpen(true)}
                >
                  <HelpCircle className="h-4 w-4" />
                  Adicionar Quiz
                </button>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => !isBusy && onOpenChange(false)} disabled={isBusy}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending || isBusy || uploadingThumb}>
              {mutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    {isEdit && quizDialogOpen && (
      <QuizDialog
        open
        onOpenChange={setQuizDialogOpen}
        aulaId={aula!.id}
        existing={quiz ?? null}
        onSuccess={() => refetchQuiz()}
      />
    )}

    <AlertDialog open={deletingQuiz} onOpenChange={setDeletingQuiz}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remover quiz?</AlertDialogTitle>
          <AlertDialogDescription>
            O quiz e todas as perguntas serão removidos permanentemente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => deleteQuizMutation.mutate()}
            disabled={deleteQuizMutation.isPending}
          >
            {deleteQuizMutation.isPending ? 'Removendo...' : 'Remover'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
  );
}

// ─── Transcode Status Badge ──────────────────────────────────────────────────

function AulaTranscodeBadge({ aula }: { aula: Aula }) {
  const { data: job } = useQuery({
    queryKey: ['transcode-status', aula.id],
    queryFn: () => treinamentosApi.getTranscodeStatus({ aulaId: aula.id }),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'done' || status === 'error') return false;
      return 5000;
    },
    enabled: !aula.hlsUrl,
  });

  if (aula.hlsUrl) {
    return <Badge variant="secondary" className="text-xs">Vídeo</Badge>;
  }

  if (!job) return null;

  if (job.status === 'pending' || job.status === 'processing') {
    return (
      <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-300">
        <Loader2 className="h-3 w-3 animate-spin mr-1" />
        {job.status === 'pending' ? 'Aguardando...' : `Processando ${job.progress}%`}
      </Badge>
    );
  }

  if (job.status === 'error') {
    return (
      <Badge variant="destructive" className="text-xs">
        Erro no vídeo
      </Badge>
    );
  }

  if (job.status === 'done') {
    return <Badge variant="secondary" className="text-xs">Vídeo</Badge>;
  }

  return null;
}

// ─── Sortable Aula Row ───────────────────────────────────────────────────────

interface SortableAulaRowProps {
  aula: Aula;
  onToggle: (id: string, publicada: boolean) => void;
  onEdit: (aula: Aula) => void;
  onDelete: (id: string) => void;
}

function SortableAulaRow({ aula, onToggle, onEdit, onDelete }: SortableAulaRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: aula.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between px-8 py-3 hover:bg-muted/20 transition-colors"
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <Video className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-sm">{aula.titulo}</span>
        {!aula.publicada && (
          <Badge variant="outline" className="text-xs">Rascunho</Badge>
        )}
        <AulaTranscodeBadge aula={aula} />
      </div>
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          title={aula.publicada ? 'Despublicar' : 'Publicar'}
          onClick={() => onToggle(aula.id, !aula.publicada)}
        >
          {aula.publicada ? (
            <EyeOff className="h-3.5 w-3.5" />
          ) : (
            <Eye className="h-3.5 w-3.5" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          title="Editar aula"
          onClick={() => onEdit(aula)}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive"
          title="Remover aula"
          onClick={() => onDelete(aula.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ─── Módulo Row ───────────────────────────────────────────────────────────────

interface ModuloRowProps {
  modulo: Modulo & { aulas: Aula[] };
  onRefresh: () => void;
  dragHandleProps?: Record<string, unknown>;
}

function ModuloRow({ modulo, onRefresh, dragHandleProps }: ModuloRowProps) {
  const [open, setOpen] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [aulaDialogModuloId, setAulaDialogModuloId] = useState<string | null>(null);
  const [editingAula, setEditingAula] = useState<Aula | null>(null);
  const [deletingModulo, setDeletingModulo] = useState(false);
  const [deletingAulaId, setDeletingAulaId] = useState<string | null>(null);

  const deleteModuloMutation = useMutation({
    mutationFn: () => treinamentosApi.deleteModulo(modulo.id),
    onSuccess: () => {
      onRefresh();
      setDeletingModulo(false);
      toast.success('Módulo removido');
    },
    onError: (error: Error) => toast.error('Erro', { description: error.message }),
  });

  const deleteAulaMutation = useMutation({
    mutationFn: (id: string) => treinamentosApi.deleteAula(id),
    onSuccess: () => {
      onRefresh();
      setDeletingAulaId(null);
      toast.success('Aula removida');
    },
    onError: (error: Error) => toast.error('Erro', { description: error.message }),
  });

  const toggleAulaMutation = useMutation({
    mutationFn: ({ id, publicada }: { id: string; publicada: boolean }) =>
      treinamentosApi.updateAula({ id, publicada }),
    onSuccess: (_, vars) => {
      onRefresh();
      toast.success(vars.publicada ? 'Aula publicada' : 'Aula despublicada');
    },
    onError: (error: Error) => toast.error('Erro', { description: error.message }),
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const handleAulaDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const sortedAulas = [...modulo.aulas].sort((a, b) => a.ordem - b.ordem);
    const oldIndex = sortedAulas.findIndex((a) => a.id === active.id);
    const newIndex = sortedAulas.findIndex((a) => a.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(sortedAulas, oldIndex, newIndex);
    reordered.forEach((a, i) => {
      if (a.ordem !== i + 1) {
        treinamentosApi.updateAula({ id: a.id, ordem: i + 1 });
      }
    });
    onRefresh();
  };

  const handleAulaCreateSuccess = (createdAula?: Aula) => {
    onRefresh();
    if (createdAula) {
      setAulaDialogModuloId(null);
      setTimeout(() => setEditingAula(createdAula), 200);
    }
  };

  const sortedAulas = [...modulo.aulas].sort((a, b) => a.ordem - b.ordem);

  return (
    <div className="border rounded-lg overflow-hidden">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between px-4 py-3 bg-muted/40 cursor-pointer hover:bg-muted/60 transition-colors">
            <div className="flex items-center gap-2">
              {dragHandleProps && (
                <button
                  type="button"
                  className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
                  onClick={(e) => e.stopPropagation()}
                  {...dragHandleProps}
                >
                  <GripVertical className="h-4 w-4" />
                </button>
              )}
              {open ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{modulo.titulo}</span>
              <Badge variant="outline" className="text-xs">
                {modulo.aulas.length} {modulo.aulas.length === 1 ? 'aula' : 'aulas'}
              </Badge>
            </div>
            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                title="Adicionar aula"
                onClick={() => setAulaDialogModuloId(modulo.id)}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                title="Editar módulo"
                onClick={() => setEditOpen(true)}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                title="Remover módulo"
                onClick={() => setDeletingModulo(true)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          {sortedAulas.length === 0 ? (
            <p className="px-8 py-4 text-sm text-muted-foreground">
              Nenhuma aula — clique em + para adicionar
            </p>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleAulaDragEnd}
            >
              <SortableContext
                items={sortedAulas.map((a) => a.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="divide-y">
                  {sortedAulas.map((aula) => (
                    <SortableAulaRow
                      key={aula.id}
                      aula={aula}
                      onToggle={(id, publicada) => toggleAulaMutation.mutate({ id, publicada })}
                      onEdit={setEditingAula}
                      onDelete={setDeletingAulaId}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </CollapsibleContent>
      </Collapsible>

      <ModuloDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        cursoId={modulo.cursoId}
        modulo={modulo}
        onSuccess={onRefresh}
      />

      {aulaDialogModuloId && (
        <AulaDialog
          open
          onOpenChange={(v) => !v && setAulaDialogModuloId(null)}
          moduloId={aulaDialogModuloId}
          onSuccess={handleAulaCreateSuccess}
        />
      )}

      {editingAula && (
        <AulaDialog
          open
          onOpenChange={(v) => !v && setEditingAula(null)}
          moduloId={modulo.id}
          aula={editingAula}
          onSuccess={() => onRefresh()}
        />
      )}

      <AlertDialog open={deletingModulo} onOpenChange={setDeletingModulo}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover módulo?</AlertDialogTitle>
            <AlertDialogDescription>
              Todas as aulas deste módulo também serão removidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteModuloMutation.mutate()}
              disabled={deleteModuloMutation.isPending}
            >
              {deleteModuloMutation.isPending ? 'Removendo...' : 'Remover'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!deletingAulaId}
        onOpenChange={(v) => !v && setDeletingAulaId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover aula?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deletingAulaId && deleteAulaMutation.mutate(deletingAulaId)}
              disabled={deleteAulaMutation.isPending}
            >
              {deleteAulaMutation.isPending ? 'Removendo...' : 'Remover'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Sortable Módulo Wrapper ─────────────────────────────────────────────────

function SortableModuloRow({
  modulo,
  onRefresh,
}: {
  modulo: Modulo & { aulas: Aula[] };
  onRefresh: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: modulo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <ModuloRow
        modulo={modulo}
        onRefresh={onRefresh}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function CursoDetalhe() {
  const params = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [moduloDialogOpen, setModuloDialogOpen] = useState(false);

  const { data: curso, isLoading } = useQuery({
    queryKey: ['treinamentos', 'cursos', params.cursoId],
    queryFn: () => treinamentosApi.getCurso(params.cursoId),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['treinamentos', 'cursos', params.cursoId] });

  const togglePublicado = useMutation({
    mutationFn: () =>
      treinamentosApi.updateCurso(params.cursoId, { publicado: !curso?.publicado }),
    onSuccess: () => {
      invalidate();
      toast.success(curso?.publicado ? 'Curso despublicado' : 'Curso publicado');
    },
    onError: (error: Error) => toast.error('Erro', { description: error.message }),
  });

  const moduloSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const handleModuloDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id || !curso) return;

      const sorted = [...curso.modulos].sort((a, b) => a.ordem - b.ordem);
      const oldIndex = sorted.findIndex((m) => m.id === active.id);
      const newIndex = sorted.findIndex((m) => m.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(sorted, oldIndex, newIndex);
      reordered.forEach((m, i) => {
        if (m.ordem !== i + 1) {
          treinamentosApi.updateModulo({ id: m.id, ordem: i + 1 });
        }
      });
      invalidate();
    },
    [curso],
  );

  const sortedModulos = curso?.modulos
    ? [...curso.modulos].sort((a, b) => a.ordem - b.ordem)
    : [];

  return (
    <AdminGuard>
      <div className="space-y-8">
        <div className="flex flex-wrap items-center gap-3 border-b border-border/60 pb-6">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full border border-border/60"
            onClick={() => navigate({ to: '/admin/treinamentos' })}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          {isLoading ? (
            <Skeleton className="h-8 w-48" />
          ) : (
            <>
              <h1 className="font-sora text-2xl font-semibold tracking-tight md:text-3xl">
                {curso?.titulo}
              </h1>
              <Badge variant={curso?.publicado ? 'default' : 'secondary'}>
                {curso?.publicado ? 'Publicado' : 'Rascunho'}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                className="ml-auto"
                onClick={() => togglePublicado.mutate()}
                disabled={togglePublicado.isPending}
              >
                {curso?.publicado ? (
                  <><EyeOff className="mr-2 h-3.5 w-3.5" />Despublicar</>
                ) : (
                  <><Eye className="mr-2 h-3.5 w-3.5" />Publicar</>
                )}
              </Button>
            </>
          )}
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Módulos e Aulas</h2>
          <Button size="sm" onClick={() => setModuloDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Módulo
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : !sortedModulos.length ? (
          <div className="border rounded-lg p-8 text-center text-muted-foreground">
            Nenhum módulo ainda. Crie o primeiro módulo para começar.
          </div>
        ) : (
          <DndContext
            sensors={moduloSensors}
            collisionDetection={closestCenter}
            onDragEnd={handleModuloDragEnd}
          >
            <SortableContext
              items={sortedModulos.map((m) => m.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {sortedModulos.map((modulo) => (
                  <SortableModuloRow
                    key={modulo.id}
                    modulo={modulo}
                    onRefresh={invalidate}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {curso && (
          <ModuloDialog
            open={moduloDialogOpen}
            onOpenChange={setModuloDialogOpen}
            cursoId={params.cursoId}
            onSuccess={invalidate}
          />
        )}
      </div>
    </AdminGuard>
  );
}
