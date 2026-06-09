export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    details?: Record<string, unknown>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 400, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Não autorizado') {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(
    message: string = 'Acesso negado',
    details?: Record<string, unknown>
  ) {
    super(message, 403, 'FORBIDDEN', details);
    this.name = 'ForbiddenError';
  }
}

// 403 por ownership: o usuário não é dono do recurso específico.
// Diferente de ForbiddenError (falta de permissão/papel), este não redireciona
// para /sem-permissao — o frontend exibe toast e deixa o usuário continuar.
export class OwnershipError extends AppError {
  constructor(
    message: string = 'Você não tem permissão para acessar este recurso',
    details?: Record<string, unknown>
  ) {
    super(message, 403, 'OWNERSHIP_DENIED', details);
    this.name = 'OwnershipError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Recurso') {
    super(`${resource} não encontrado`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 409, 'CONFLICT', details);
    this.name = 'ConflictError';
  }
}

export class UnprocessableEntityError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 422, 'UNPROCESSABLE_ENTITY', details);
    this.name = 'UnprocessableEntityError';
  }
}

export class QuotaExceededError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 429, 'QUOTA_EXCEEDED', details);
    this.name = 'QuotaExceededError';
  }
}
