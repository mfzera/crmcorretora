import { ApiError } from '@/infra/http/api';

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/**
 * Extrai uma mensagem de erro legível a partir de qualquer erro lançado pela API.
 * Prioriza mensagens específicas do backend; usa fallback genérico para erros inesperados.
 */
export function handleApiError(error: unknown, fallback = 'Ocorreu um erro inesperado'): string {
  if (!isApiError(error)) {
    if (error instanceof Error) return error.message;
    return fallback;
  }

  switch (error.code) {
    case 'NETWORK_ERROR':
      return 'Sem conexão com o servidor. Verifique sua internet e tente novamente.';

    case 'VALIDATION_ERROR': {
      const details = error.details as Array<{ field?: string; message?: string }> | undefined;
      if (Array.isArray(details) && details.length > 0) {
        const fieldErrors = details.filter((d) => d.field && d.message);
        if (fieldErrors.length > 0) {
          return fieldErrors.map((d) => `${d.field}: ${d.message}`).join('. ');
        }
      }
      return error.message || 'Dados inválidos. Verifique os campos e tente novamente.';
    }

    case 'CONFLICT':
      // Mensagem do backend é sempre específica (ex: "E-mail já cadastrado")
      return error.message || 'Este registro já existe.';

    case 'REFERENCE_ERROR':
      return error.message || 'Referência inválida. O item relacionado não existe.';

    case 'NOT_FOUND':
      return error.message || 'Registro não encontrado.';

    case 'UNPROCESSABLE_ENTITY':
      return error.message || 'Operação não permitida no estado atual.';

    case 'QUOTA_EXCEEDED':
      return error.message || 'Limite do plano atingido.';

    case 'UNAUTHORIZED':
      return 'Sessão expirada. Faça login novamente.';

    case 'FORBIDDEN': {
      const details = error.details as { permissoesNecessarias?: string[] } | undefined;
      const perms = details?.permissoesNecessarias;
      if (perms?.length) {
        return `Permissão necessária: ${perms.join(', ')}`;
      }
      return 'Você não tem permissão para realizar esta ação.';
    }

    case 'FORBIDDEN_LOCAL':
      return 'Você não tem permissão para realizar esta ação.';

    case 'INTERNAL_ERROR': {
      const id = error.requestId;
      return id
        ? `Erro interno do servidor. Tente novamente em instantes. (ID: ${id.slice(0, 8)})`
        : 'Erro interno do servidor. Tente novamente em instantes.';
    }

    default:
      return error.message || fallback;
  }
}

/**
 * Aplica erros de validação retornados pela API diretamente nos campos do formulário.
 * Funciona com React Hook Form. Retorna true se algum erro foi aplicado.
 */
export function applyApiErrorsToForm(
  error: unknown,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setError: (field: any, error: { message: string }) => void,
): boolean {
  if (!isApiError(error) || error.code !== 'VALIDATION_ERROR') return false;

  const details = error.details as Array<{ field?: string; message?: string }> | undefined;
  if (!Array.isArray(details) || details.length === 0) return false;

  let applied = false;
  for (const d of details) {
    if (d.field && d.message) {
      setError(d.field, { message: d.message });
      applied = true;
    }
  }
  return applied;
}
