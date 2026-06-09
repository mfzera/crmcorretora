import { usePermissions } from './use-permissions';
import { toast } from 'sonner';

/**
 * Hook for wrapping actions with permission checks
 *
 * Usage:
 * ```tsx
 * const protectedAction = useProtectedAction();
 *
 * const handleDelete = protectedAction(
 *   'clientes:excluir',
 *   async (id: string) => {
 *     await api.delete(`/clients/${id}`);
 *     toast.success('Cliente excluído!');
 *   }
 * );
 * ```
 */
export function useProtectedAction() {
  const { hasPermission } = usePermissions();

  return function protectedAction<T extends (...args: any[]) => any>(
    permission: string,
    action: T,
    options?: {
      onUnauthorized?: () => void;
      errorMessage?: string;
    }
  ): T {
    return ((...args: Parameters<T>) => {
      if (!hasPermission(permission)) {
        const message = options?.errorMessage || 'Você não tem permissão para esta ação';
        toast.error(message);

        if (options?.onUnauthorized) {
          options.onUnauthorized();
        }

        return;
      }

      return action(...args);
    }) as T;
  };
}

/**
 * Hook for wrapping async actions with permission checks and error handling
 *
 * Usage:
 * ```tsx
 * const protectedAsyncAction = useProtectedAsyncAction();
 *
 * const handleDelete = protectedAsyncAction(
 *   'clientes:excluir',
 *   async (id: string) => {
 *     await api.delete(`/clients/${id}`);
 *   },
 *   {
 *     successMessage: 'Cliente excluído com sucesso!',
 *     errorMessage: 'Erro ao excluir cliente'
 *   }
 * );
 * ```
 */
export function useProtectedAsyncAction() {
  const { hasPermission } = usePermissions();

  return function protectedAsyncAction<T extends (...args: any[]) => Promise<any>>(
    permission: string,
    action: T,
    options?: {
      successMessage?: string;
      errorMessage?: string;
      onSuccess?: (result: any) => void;
      onError?: (error: any) => void;
      onUnauthorized?: () => void;
    }
  ): T {
    return (async (...args: Parameters<T>) => {
      if (!hasPermission(permission)) {
        const message = 'Você não tem permissão para esta ação';
        toast.error(message);

        if (options?.onUnauthorized) {
          options.onUnauthorized();
        }

        return;
      }

      try {
        const result = await action(...args);

        if (options?.successMessage) {
          toast.success(options.successMessage);
        }

        if (options?.onSuccess) {
          options.onSuccess(result);
        }

        return result;
      } catch (error: any) {
        const message = options?.errorMessage || error?.message || 'Erro ao executar ação';
        toast.error(message);

        if (options?.onError) {
          options.onError(error);
        }

        throw error;
      }
    }) as T;
  };
}
