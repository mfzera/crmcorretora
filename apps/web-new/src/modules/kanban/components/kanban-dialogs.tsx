import {
  createContext,
  lazy,
  ReactNode,
  Suspense,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
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
import { handleApiError } from '@/core/utils/handle-api-error';
import type { Oportunidade } from '@/types/kanban';
import { useDeleteOportunidade } from '../http';

const EditarOportunidadeDialog = lazy(() =>
  import('./editar-oportunidade-dialog').then((m) => ({ default: m.EditarOportunidadeDialog })),
);
const PerderOportunidadeDialog = lazy(() =>
  import('./perder-oportunidade-dialog').then((m) => ({ default: m.PerderOportunidadeDialog })),
);
const FecharOportunidadeDialog = lazy(() =>
  import('./fechar-oportunidade-dialog').then((m) => ({ default: m.FecharOportunidadeDialog })),
);
const CompartilharOportunidadeSheet = lazy(() =>
  import('./compartilhar-oportunidade-sheet').then((m) => ({ default: m.CompartilharOportunidadeSheet })),
);
const HistoricoOportunidadeSheet = lazy(() =>
  import('./historico-oportunidade-sheet').then((m) => ({ default: m.HistoricoOportunidadeSheet })),
);

export type KanbanActions = {
  onEdit: (oportunidade: Oportunidade) => void;
  onDelete: (oportunidade: Oportunidade) => void;
  onPerder: (oportunidade: Oportunidade) => void;
  onFechar: (oportunidade: Oportunidade) => void;
  onShare: (oportunidade: Oportunidade) => void;
  onHistorico: (oportunidade: Oportunidade) => void;
};

const KanbanActionsContext = createContext<KanbanActions | null>(null);

export function useKanbanActions(): KanbanActions {
  const ctx = useContext(KanbanActionsContext);
  if (!ctx) {
    throw new Error('useKanbanActions must be used within KanbanActionsProvider');
  }
  return ctx;
}

/**
 * Provider isola o state dos dialogs do board. O context value é estável
 * (useMemo []), então consumidores não re-renderizam quando um dialog abre/fecha.
 * O board passa {children}, que mantém referência estável e também não é
 * re-renderizado quando o state interno muda.
 */
export function KanbanActionsProvider({ children }: { children: ReactNode }) {
  const [editingOportunidade, setEditingOportunidade] = useState<Oportunidade | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deletingOportunidade, setDeletingOportunidade] = useState<Oportunidade | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [perdendoOportunidade, setPerdendoOportunidade] = useState<Oportunidade | null>(null);
  const [perderDialogOpen, setPerderDialogOpen] = useState(false);
  const [fechandoOportunidade, setFechandoOportunidade] = useState<Oportunidade | null>(null);
  const [fecharDialogOpen, setFecharDialogOpen] = useState(false);
  const [compartilhandoOportunidade, setCompartilhandoOportunidade] = useState<Oportunidade | null>(null);
  const [compartilharSheetOpen, setCompartilharSheetOpen] = useState(false);
  const [historicoOportunidade, setHistoricoOportunidade] = useState<Oportunidade | null>(null);
  const [historicoSheetOpen, setHistoricoSheetOpen] = useState(false);

  const deleteOportunidade = useDeleteOportunidade();

  // Handlers são estáveis: usam apenas setters (que são estáveis por garantia
  // do React). useMemo([], ...) congela a referência do objeto exposto via
  // context — consumidores nunca recebem nova referência por causa de state
  // interno deste provider.
  const handlers = useMemo<KanbanActions>(
    () => ({
      onEdit: (oportunidade) => {
        setEditingOportunidade(oportunidade);
        setEditDialogOpen(true);
      },
      onDelete: (oportunidade) => {
        setDeletingOportunidade(oportunidade);
        setDeleteDialogOpen(true);
      },
      onPerder: (oportunidade) => {
        setPerdendoOportunidade(oportunidade);
        setPerderDialogOpen(true);
      },
      onFechar: (oportunidade) => {
        setFechandoOportunidade(oportunidade);
        setFecharDialogOpen(true);
      },
      onShare: (oportunidade) => {
        setCompartilhandoOportunidade(oportunidade);
        setCompartilharSheetOpen(true);
      },
      onHistorico: (oportunidade) => {
        setHistoricoOportunidade(oportunidade);
        setHistoricoSheetOpen(true);
      },
    }),
    [],
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (!deletingOportunidade) return;
    try {
      await deleteOportunidade.mutateAsync(deletingOportunidade.id);
      toast.success('Oportunidade excluída com sucesso');
      setDeleteDialogOpen(false);
      setDeletingOportunidade(null);
    } catch (error) {
      toast.error(handleApiError(error));
    }
  }, [deletingOportunidade, deleteOportunidade]);

  return (
    <KanbanActionsContext.Provider value={handlers}>
      {children}

      {editingOportunidade && (
        <Suspense fallback={null}>
          <EditarOportunidadeDialog
            oportunidade={editingOportunidade}
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
          />
        </Suspense>
      )}

      {perdendoOportunidade && (
        <Suspense fallback={null}>
          <PerderOportunidadeDialog
            oportunidade={perdendoOportunidade}
            open={perderDialogOpen}
            onOpenChange={setPerderDialogOpen}
          />
        </Suspense>
      )}

      {fechandoOportunidade && (
        <Suspense fallback={null}>
          <FecharOportunidadeDialog
            oportunidade={fechandoOportunidade}
            open={fecharDialogOpen}
            onOpenChange={setFecharDialogOpen}
          />
        </Suspense>
      )}

      {compartilhandoOportunidade && (
        <Suspense fallback={null}>
          <CompartilharOportunidadeSheet
            oportunidade={compartilhandoOportunidade}
            open={compartilharSheetOpen}
            onOpenChange={setCompartilharSheetOpen}
          />
        </Suspense>
      )}

      {historicoOportunidade && (
        <Suspense fallback={null}>
          <HistoricoOportunidadeSheet
            oportunidade={historicoOportunidade}
            open={historicoSheetOpen}
            onOpenChange={setHistoricoSheetOpen}
          />
        </Suspense>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <Trash2 className="h-6 w-6 text-destructive" />
            </div>
            <AlertDialogTitle className="text-center">
              Excluir oportunidade
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Tem certeza que deseja excluir a oportunidade de{' '}
              <span className="font-medium text-foreground">
                {deletingOportunidade?.nomeCliente}
              </span>
              ? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center gap-2 mt-4">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </KanbanActionsContext.Provider>
  );
}
