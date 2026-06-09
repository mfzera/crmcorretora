import '@ecotech/shared/types';
import { FastifyInstance, FastifyError } from 'fastify';
import fp from 'fastify-plugin';
import { ZodError } from 'zod';
import { AppError } from '@ecotech/shared/utils';
import { logger } from '@ecotech/shared/utils/logger';
import * as Sentry from '@sentry/node';

async function errorHandlerPlugin(fastify: FastifyInstance) {
  fastify.setErrorHandler((error: FastifyError | Error, request, reply) => {
    const errorStatus = error instanceof AppError ? error.statusCode : ('statusCode' in error ? (error as FastifyError).statusCode ?? 500 : 500);
    const logFn = errorStatus < 500 ? logger.warn.bind(logger) : logger.error.bind(logger);
    logFn({
      err: error,
      requestId: request.requestId,
      url: request.url,
      method: request.method,
      corretoraId: request.corretoraId,
      userId: request.user?.sub,
    });

    if (errorStatus >= 500) {
      Sentry.captureException(error, {
        extra: { requestId: request.requestId, url: request.url, method: request.method, corretoraId: request.corretoraId, userId: request.user?.sub },
      });
    }

    // Handle AppError (our custom errors)
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      });
    }

    // Handle Zod validation errors
    if (error instanceof ZodError) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Dados inválidos',
          details: error.issues.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
      });
    }

    // Handle Fastify validation errors (AJV)
    if ('validation' in error && error.validation) {
      const ajvMessages: Record<string, string> = {
        type: 'tipo inválido',
        required: 'campo obrigatório',
        minLength: 'muito curto',
        maxLength: 'muito longo',
        minimum: 'valor muito baixo',
        maximum: 'valor muito alto',
        format: 'formato inválido',
        enum: 'valor não permitido',
        pattern: 'formato inválido',
        additionalProperties: 'campo não permitido',
      };

      const details = (error.validation as Array<{
        keyword?: string;
        instancePath?: string;
        params?: Record<string, unknown>;
        message?: string;
      }>).map((v) => {
        const rawField = v.instancePath?.replace(/^\/(body|params|query|headers)\//, '').replace(/\//g, '.') || 'campo';
        const message = ajvMessages[v.keyword ?? ''] ?? v.message ?? 'inválido';
        return { field: rawField, message };
      });

      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Dados inválidos',
          details,
        },
      });
    }

    // Handle JWT errors
    if (
      error.name === 'JsonWebTokenError' ||
      error.name === 'TokenExpiredError'
    ) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Token inválido ou expirado',
        },
      });
    }

    // Handle database constraint violations
    if ('code' in error) {
      const dbError = error as { code: string; constraint?: string };

      if (dbError.code === '23505') {
        // Unique violation
        return reply.status(409).send({
          success: false,
          error: {
            code: 'CONFLICT',
            message: 'Registro já existe',
            details: { constraint: dbError.constraint },
          },
        });
      }

      if (dbError.code === '23503') {
        // Foreign key violation
        return reply.status(400).send({
          success: false,
          error: {
            code: 'REFERENCE_ERROR',
            message: 'Referência inválida',
            details: { constraint: dbError.constraint },
          },
        });
      }
    }

    // Default error response
    const statusCode =
      'statusCode' in error ? (error.statusCode as number) : 500;

    return reply.status(statusCode).send({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message:
          process.env['NODE_ENV'] === 'production'
            ? 'Erro interno do servidor'
            : error.message,
      },
    });
  });

  // Handle not found routes
  fastify.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Rota ${request.method} ${request.url} não encontrada`,
      },
    });
  });
}

const errorHandlerPluginWithFp = fp(errorHandlerPlugin, {
  name: 'error-handler',
});

export default errorHandlerPluginWithFp;
export { errorHandlerPluginWithFp as errorHandler };
