import { FastifyRequest } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { eq, and, isNull, inArray } from 'drizzle-orm';
import { authorize } from '@ecotech/plugins/authorization';
import { StorageService, PdfExtractor } from '@ecotech/shared/storage';
import { z } from 'zod';
import {
  db,
  cotacoes,
  documentosVenda,
  mensagensChat,
  canaisMembros,
  anexos,
  endossos,
  sinistros,
  usuarios,
} from '@ecotech/shared/database';
import { NotFoundError, OwnershipError } from '@ecotech/shared/utils';

// Schema de validação para upload
const uploadAnexoSchema = z.object({
  entidadeTipo: z.enum(['cotacao', 'documento_venda', 'mensagem_chat', 'endosso', 'sinistro']),
  entidadeId: z.string().uuid(),
});

/**
 * Middleware: Validar acesso à entidade vinculada ao anexo
 */
export async function validateEntityAccess(
  entidadeTipo: string,
  entidadeId: string,
  userId: string,
  corretoraId: string,
): Promise<boolean> {
  if (entidadeTipo === 'cotacao') {
    const cotacao = await db.query.cotacoes.findFirst({
      where: and(
        eq(cotacoes.id, entidadeId),
        eq(cotacoes.corretoraId, corretoraId),
      ),
    });
    return !!cotacao;
  }

  if (entidadeTipo === 'documento_venda') {
    const doc = await db.query.documentosVenda.findFirst({
      where: and(
        eq(documentosVenda.id, entidadeId),
        eq(documentosVenda.corretoraId, corretoraId),
      ),
    });
    return !!doc;
  }

  if (entidadeTipo === 'endosso') {
    const endosso = await db.query.endossos.findFirst({
      where: and(
        eq(endossos.id, entidadeId),
        eq(endossos.corretoraId, corretoraId),
        isNull(endossos.deletedAt),
      ),
    });
    return !!endosso;
  }

  if (entidadeTipo === 'sinistro') {
    const sinistro = await db.query.sinistros.findFirst({
      where: and(
        eq(sinistros.id, entidadeId),
        eq(sinistros.corretoraId, corretoraId),
        isNull(sinistros.deletedAt),
      ),
    });
    return !!sinistro;
  }

  if (entidadeTipo === 'mensagem_chat') {
    // Validar acesso ao canal
    const mensagem = (await db.query.mensagensChat.findFirst({
      where: eq(mensagensChat.id, entidadeId),
      with: { canal: true } as any,
    })) as
      | (typeof mensagensChat.$inferSelect & {
          canal: { corretoraId: string } | null;
        })
      | null;

    if (!mensagem) return false;

    // Verificar tenant
    if (mensagem.canal?.corretoraId !== corretoraId) return false;

    // Verificar se usuário é membro do canal
    const membro = await db.query.canaisMembros.findFirst({
      where: and(
        eq(canaisMembros.canalId, mensagem.canalId),
        eq(canaisMembros.usuarioId, userId),
      ),
    });

    return !!membro;
  }

  return false;
}

/**
 * Ownership check para anexos — espelha a lógica de requireOwnership mas
 * aceita os tipos de entidade suportados pelo módulo de anexos (cotacao,
 * documento_venda, endosso, mensagem_chat).
 *
 * Regras:
 *   - admin/gestor: acesso total
 *   - cadastro:editar_apolice: acesso total para documento_venda e endosso
 *   - mensagem_chat: precisa ser membro do canal (tenant já validado)
 *   - cotacao/documento_venda/endosso: ser atuante, vendedor principal, ou
 *     da mesma equipe de qualquer um dos dois
 *
 * Throws OwnershipError se negado, NotFoundError se entidade inexistente.
 */
export async function assertEntityOwnership(
  request: FastifyRequest,
  entidadeTipo: string,
  entidadeId: string,
): Promise<void> {
  const user = request.user;
  const corretoraId = request.corretoraId;

  // Mensagem de chat: privacidade do canal prevalece sobre bypass administrativo.
  // Mesmo admin/gestor precisa ser membro do canal.
  if (entidadeTipo === 'mensagem_chat') {
    const ok = await validateEntityAccess(
      entidadeTipo,
      entidadeId,
      user.sub,
      corretoraId,
    );
    if (!ok) {
      // Tratado como 403 (OwnershipError) mesmo quando a mensagem não existe,
      // para não vazar via status code se uma entidade de outro tenant existe.
      throw new OwnershipError(
        'Você não é membro do canal desta mensagem',
      );
    }
    return;
  }

  // Para cotacao/documento_venda/endosso, sempre buscamos a entidade (mesmo
  // para admin/gestor/cadastro) para validar existência + tenant. Se não
  // existir, 403 (não vazamos 404 para cross-tenant).
  let atuanteId: string | null | undefined;
  let vendedorId: string | null | undefined;
  const extraOwnerIds: (string | null | undefined)[] = [];
  let entidadeExiste = false;

  if (entidadeTipo === 'cotacao') {
    const [row] = await db
      .select({
        atuanteId: cotacoes.atuanteId,
        vendedorId: cotacoes.vendedorId,
      })
      .from(cotacoes)
      .where(and(eq(cotacoes.id, entidadeId), eq(cotacoes.corretoraId, corretoraId)))
      .limit(1);
    if (row) {
      entidadeExiste = true;
      atuanteId = row.atuanteId;
      vendedorId = row.vendedorId;
    }
  } else if (entidadeTipo === 'documento_venda') {
    const [row] = await db
      .select({
        atuanteId: documentosVenda.atuanteId,
        vendedorId: documentosVenda.vendedorId,
      })
      .from(documentosVenda)
      .where(
        and(
          eq(documentosVenda.id, entidadeId),
          eq(documentosVenda.corretoraId, corretoraId),
        ),
      )
      .limit(1);
    if (row) {
      entidadeExiste = true;
      atuanteId = row.atuanteId;
      vendedorId = row.vendedorId;
    }
  } else if (entidadeTipo === 'endosso') {
    // Endosso herda ownership do documento pai: o atuante do documento
    // (ex.: quem registrou endosso externo) precisa conseguir anexar/listar
    // arquivos mesmo que o vendedor do endosso seja o dono original do cliente.
    const [row] = await db
      .select({
        endossoVendedorId: endossos.vendedorId,
        docAtuanteId: documentosVenda.atuanteId,
        docVendedorId: documentosVenda.vendedorId,
      })
      .from(endossos)
      .innerJoin(
        documentosVenda,
        eq(documentosVenda.id, endossos.documentoVendaId),
      )
      .where(
        and(
          eq(endossos.id, entidadeId),
          eq(endossos.corretoraId, corretoraId),
          isNull(endossos.deletedAt),
        ),
      )
      .limit(1);
    if (row) {
      entidadeExiste = true;
      atuanteId = row.docAtuanteId;
      vendedorId = row.docVendedorId ?? row.endossoVendedorId;
      extraOwnerIds.push(row.endossoVendedorId);
    }
  } else if (entidadeTipo === 'sinistro') {
    const [row] = await db
      .select({
        solicitanteId: sinistros.solicitanteId,
      })
      .from(sinistros)
      .where(
        and(
          eq(sinistros.id, entidadeId),
          eq(sinistros.corretoraId, corretoraId),
          isNull(sinistros.deletedAt),
        ),
      )
      .limit(1);
    if (row) {
      entidadeExiste = true;
      vendedorId = row.solicitanteId;
    }
  } else {
    throw new OwnershipError(
      `Tipo de entidade não suportado: ${entidadeTipo}`,
    );
  }

  if (!entidadeExiste) {
    throw new OwnershipError(
      'Entidade inexistente ou fora do seu escopo',
    );
  }

  // Bypass administrativo após confirmar que a entidade existe no tenant
  if (user.isAdmin || user.isGestor) return;

  // Cadastro tem acesso total a cotações, documentos e endossos (precisam ver/adicionar
  // anexos no fluxo de aprovação, incluindo cotações de outros vendedores)
  if (
    (entidadeTipo === 'documento_venda' || entidadeTipo === 'endosso' || entidadeTipo === 'cotacao') &&
    Array.isArray(user.permissoes) &&
    user.permissoes.includes('cadastro:editar_apolice')
  ) {
    return;
  }

  // Usuários com permissão para ver todos os sinistros têm acesso aos anexos
  if (
    entidadeTipo === 'sinistro' &&
    Array.isArray(user.permissoes) &&
    user.permissoes.includes('sinistros:visualizar_todos')
  ) {
    return;
  }

  // Dono direto
  if (
    atuanteId === user.sub ||
    vendedorId === user.sub ||
    extraOwnerIds.includes(user.sub)
  ) {
    return;
  }

  // Mesma equipe (do atuante, vendedor ou qualquer outro dono candidato)
  const candidateOwnerIds = [atuanteId, vendedorId, ...extraOwnerIds].filter(
    (id): id is string => !!id,
  );
  if (candidateOwnerIds.length === 0) {
    throw new OwnershipError(
      'Você não tem acesso ao recurso vinculado a este anexo',
    );
  }

  const [meUsuario, ...donoUsuarios] = await Promise.all([
    db.query.usuarios.findFirst({
      where: eq(usuarios.id, user.sub),
      columns: { equipeId: true },
    }),
    ...candidateOwnerIds.map((ownerId) =>
      db.query.usuarios.findFirst({
        where: eq(usuarios.id, ownerId),
        columns: { equipeId: true },
      }),
    ),
  ]);

  const mesmaEquipe =
    !!meUsuario?.equipeId &&
    donoUsuarios.some(
      (dono) => dono?.equipeId && dono.equipeId === meUsuario.equipeId,
    );

  if (!mesmaEquipe) {
    throw new OwnershipError(
      'Você não tem acesso ao recurso vinculado a este anexo',
    );
  }
}

const anexosRoutes: FastifyPluginAsyncZod = async function (fastify) {
  const storageService = new StorageService();
  const pdfExtractor = new PdfExtractor();

  fastify.addHook('preHandler', fastify.authenticate);

  /**
   * POST /api/anexos/upload
   * Upload de arquivo
   * SEGURANÇA: Rate limited para 10 uploads por minuto por usuário
   */
  fastify.post(
    '/upload',
    {
      schema: {
        tags: ['Anexos'],
        summary: 'Upload de arquivo',
        description:
          'Faz upload de um arquivo para o R2 e cria registro no banco',
      },
      preHandler: [
        authorize(['vendas:criar_cotacao']),
        // SEGURANÇA: Rate limit de 10 uploads por minuto
        async (request, reply) => {
          const key = `upload:${request.user.sub}`;
          const uploads = (fastify as any).uploadCounts?.[key] || {
            count: 0,
            resetTime: Date.now() + 60000,
          };

          if (Date.now() > uploads.resetTime) {
            uploads.count = 0;
            uploads.resetTime = Date.now() + 60000;
          }

          uploads.count++;

          if (!(fastify as any).uploadCounts) {
            (fastify as any).uploadCounts = {};
          }
          (fastify as any).uploadCounts[key] = uploads;

          if (uploads.count > 10) {
            return reply.status(429).send({
              error:
                'Limite de uploads excedido. Máximo de 10 uploads por minuto.',
            });
          }
        },
      ],
    },
    async (request, reply) => {
      try {
        fastify.log.info(
          {
            userId: request.user.sub,
            corretoraId: request.corretoraId,
            hasUser: !!request.user,
          },
          '🔍 Request upload - dados do usuário',
        );

        // Processar multipart e coletar campos e arquivo
        const parts = request.parts();
        let fileBuffer: Buffer | null = null;
        let fileMimetype: string = '';
        let fileFilename: string = '';
        let entidadeTipo: string | undefined;
        let entidadeId: string | undefined;

        for await (const part of parts) {
          if (part.type === 'file') {
            // Consume the file buffer immediately so the multipart
            // iterator can advance to subsequent fields
            fileBuffer = await part.toBuffer();
            fileMimetype = part.mimetype;
            fileFilename = part.filename;
          } else {
            // Campo de formulário
            if (part.fieldname === 'entidadeTipo') {
              entidadeTipo = part.value as string;
            } else if (part.fieldname === 'entidadeId') {
              entidadeId = part.value as string;
            }
          }
        }

        if (!fileBuffer) {
          return reply.status(400).send({
            error: 'Nenhum arquivo foi enviado',
          });
        }

        // Validar campos do form
        const fields = uploadAnexoSchema.parse({
          entidadeTipo,
          entidadeId,
        });

        // Validar ownership da entidade vinculada (não apenas tenant)
        await assertEntityOwnership(
          request,
          fields.entidadeTipo,
          fields.entidadeId,
        );

        const buffer = fileBuffer;

        fastify.log.info(
          {
            fileName: fileFilename,
            mimeType: fileMimetype,
            size: buffer.length,
            entidadeTipo: fields.entidadeTipo,
            entidadeId: fields.entidadeId,
          },
          '📤 Iniciando upload',
        );

        // Upload via storage service
        let result;
        try {
          const uploadParams = {
            file: buffer,
            fileName: fileFilename,
            mimeType: fileMimetype,
            corretoraId: request.corretoraId,
            entidadeTipo: fields.entidadeTipo,
            entidadeId: fields.entidadeId,
            uploadPorId: request.user.sub,
          };

          fastify.log.info(
            {
              ...uploadParams,
              file: `Buffer(${buffer.length} bytes)`,
            },
            '📦 Params antes do upload',
          );

          result = await storageService.uploadFile(uploadParams);
          fastify.log.info({ result }, '✅ Upload concluído');
        } catch (uploadError: any) {
          fastify.log.error(
            { error: uploadError.message, stack: uploadError.stack },
            '❌ Erro no storageService.uploadFile',
          );
          throw uploadError;
        }

        // Retornar no formato ApiResponse padrão
        return reply.status(201).send({
          success: true,
          data: result,
        });
      } catch (error: any) {
        fastify.log.error({ error }, 'Erro ao fazer upload');

        if (error.message.includes('não permitido')) {
          return reply.status(400).send({ error: error.message });
        }

        if (error.message.includes('muito grande')) {
          return reply.status(413).send({ error: error.message });
        }

        throw error;
      }
    },
  );

  /**
   * GET /api/anexos/:id
   * Obter informações do anexo
   */
  fastify.get(
    '/:id',
    {
      schema: {
        tags: ['Anexos'],
        summary: 'Obter anexo',
        description: 'Retorna informações de um anexo específico',
        params: z.object({ id: z.string().uuid() }),
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const anexo = await db.query.anexos.findFirst({
        where: and(
          eq(anexos.id, id),
          eq(anexos.corretoraId, request.corretoraId),
          isNull(anexos.deletedAt),
        ),
        with: {
          uploadPor: {
            columns: {
              id: true,
              nome: true,
              email: true,
            },
          },
        },
      });

      if (!anexo) {
        throw new NotFoundError('Anexo');
      }

      await assertEntityOwnership(request, anexo.entidadeTipo, anexo.entidadeId);

      // SEGURANÇA: Gerar URL assinada com validação de tenant
      let urlAssinada: string | null = null;
      try {
        urlAssinada = await storageService.getSignedUrl(
          anexo.id,
          request.corretoraId,
        ) ?? null;
      } catch {
        // URL assinada pode não estar disponível em ambientes sem storage
      }

      return reply.send({
        ...anexo,
        urlAssinada,
      });
    },
  );

  /**
   * GET /api/anexos/:id/download
   * Gerar URL assinada para download direto
   */
  fastify.get(
    '/:id/download',
    {
      schema: {
        tags: ['Anexos'],
        summary: 'URL de download',
        description: 'Gera URL assinada para download direto do R2',
        params: z.object({ id: z.string().uuid() }),
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      // Verificar se anexo pertence ao tenant
      const anexo = await db.query.anexos.findFirst({
        where: and(
          eq(anexos.id, id),
          eq(anexos.corretoraId, request.corretoraId),
          isNull(anexos.deletedAt),
        ),
      });

      if (!anexo) {
        throw new NotFoundError('Anexo');
      }

      await assertEntityOwnership(request, anexo.entidadeTipo, anexo.entidadeId);

      // SEGURANÇA: Gerar URL assinada com validação de tenant
      let urlAssinada: string | null = null;
      try {
        urlAssinada = await storageService.getSignedUrl(
          anexo.id,
          request.corretoraId,
        ) ?? null;
      } catch {
        // URL assinada pode não estar disponível em ambientes sem storage
      }

      return reply.send({
        url: urlAssinada,
        expiresIn: '1h', // SEGURANÇA: Reduzido de 24h para 1h
      });
    },
  );

  /**
   * DELETE /api/anexos/:id
   * Deletar anexo (soft delete)
   */
  fastify.delete(
    '/:id',
    {
      schema: {
        tags: ['Anexos'],
        summary: 'Deletar anexo',
        description: 'Remove um anexo (soft delete)',
        params: z.object({ id: z.string().uuid() }),
      },
      preHandler: [authorize(['vendas:criar_cotacao'])], // TODO: ajustar permissão
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      // Verificar se anexo pertence ao tenant
      const anexo = await db.query.anexos.findFirst({
        where: and(
          eq(anexos.id, id),
          eq(anexos.corretoraId, request.corretoraId),
          isNull(anexos.deletedAt),
        ),
      });

      if (!anexo) {
        throw new NotFoundError('Anexo');
      }

      await assertEntityOwnership(request, anexo.entidadeTipo, anexo.entidadeId);

      // Deletar via storage service
      await storageService.deleteFile(id, request.user.sub);

      return reply.status(200).send({
        success: true,
        message: 'Anexo excluído com sucesso',
      });
    },
  );

  /**
   * GET /api/anexos/entidade/:tipo/:id
   * Listar anexos de uma entidade
   */
  fastify.get(
    '/entidade/:tipo/:id',
    {
      schema: {
        tags: ['Anexos'],
        summary: 'Listar anexos de entidade',
        description: 'Lista todos os anexos de uma cotação, documento ou chat',
        params: z.object({
          tipo: z.enum(['cotacao', 'documento_venda', 'mensagem_chat', 'endosso', 'sinistro']),
          id: z.string().uuid(),
        }),
      },
    },
    async (request, reply) => {
      const { tipo, id } = request.params as {
        tipo: 'cotacao' | 'documento_venda' | 'mensagem_chat' | 'endosso' | 'sinistro';
        id: string;
      };

      await assertEntityOwnership(request, tipo, id);

      const fetchAnexos = (entidadeTipo: string, entidadeId: string) =>
        db.query.anexos.findMany({
          where: and(
            eq(anexos.corretoraId, request.corretoraId),
            eq(anexos.entidadeTipo, entidadeTipo as typeof anexos.entidadeTipo._.data),
            eq(anexos.entidadeId, entidadeId),
            isNull(anexos.deletedAt),
          ),
          with: {
            uploadPor: {
              columns: { id: true, nome: true, email: true },
            },
          },
          orderBy: (a, { desc }) => [desc(a.uploadEm)],
        });

      let listaAnexos = await fetchAnexos(tipo, id);

      if (tipo === 'documento_venda') {
        const cotacoesVinculadas = await db
          .select({ id: cotacoes.id })
          .from(cotacoes)
          .where(eq(cotacoes.documentoVendaId, id));

        if (cotacoesVinculadas.length > 0) {
          const cotacaoIds = cotacoesVinculadas.map((c) => c.id);
          const anexosCotacoes = await db.query.anexos.findMany({
            where: and(
              eq(anexos.corretoraId, request.corretoraId),
              eq(anexos.entidadeTipo, 'cotacao'),
              inArray(anexos.entidadeId, cotacaoIds),
              isNull(anexos.deletedAt),
            ),
            with: { uploadPor: { columns: { id: true, nome: true, email: true } } },
            orderBy: (a, { desc }) => [desc(a.uploadEm)],
          });
          listaAnexos = [...listaAnexos, ...anexosCotacoes];
        }

        const endossosVinculados = await db
          .select({ id: endossos.id })
          .from(endossos)
          .where(and(eq(endossos.documentoVendaId, id), isNull(endossos.deletedAt)));

        if (endossosVinculados.length > 0) {
          const endossoIds = endossosVinculados.map((e) => e.id);
          const anexosEndossos = await db.query.anexos.findMany({
            where: and(
              eq(anexos.corretoraId, request.corretoraId),
              eq(anexos.entidadeTipo, 'endosso'),
              inArray(anexos.entidadeId, endossoIds),
              isNull(anexos.deletedAt),
            ),
            with: { uploadPor: { columns: { id: true, nome: true, email: true } } },
            orderBy: (a, { desc }) => [desc(a.uploadEm)],
          });
          listaAnexos = [...listaAnexos, ...anexosEndossos];
        }
      }

      if (tipo === 'cotacao') {
        const [cotacao] = await db
          .select({ documentoVendaId: cotacoes.documentoVendaId })
          .from(cotacoes)
          .where(
            and(
              eq(cotacoes.id, id),
              eq(cotacoes.corretoraId, request.corretoraId),
              isNull(cotacoes.deletedAt),
            ),
          )
          .limit(1);

        if (cotacao?.documentoVendaId) {
          const anexosDocumento = await fetchAnexos('documento_venda', cotacao.documentoVendaId);
          listaAnexos = [...listaAnexos, ...anexosDocumento];
        }
      }

      if (tipo === 'sinistro') {
        const [sinistro] = await db
          .select({ documentoVendaId: sinistros.documentoVendaId })
          .from(sinistros)
          .where(
            and(
              eq(sinistros.id, id),
              eq(sinistros.corretoraId, request.corretoraId),
              isNull(sinistros.deletedAt),
            ),
          )
          .limit(1);

        if (sinistro?.documentoVendaId) {
          const anexosApolice = await fetchAnexos('documento_venda', sinistro.documentoVendaId);
          listaAnexos = [...listaAnexos, ...anexosApolice];
        }
      }

      if (tipo === 'endosso') {
        const [endosso] = await db
          .select({ documentoVendaId: endossos.documentoVendaId })
          .from(endossos)
          .where(
            and(
              eq(endossos.id, id),
              eq(endossos.corretoraId, request.corretoraId),
              isNull(endossos.deletedAt),
            ),
          )
          .limit(1);

        if (endosso?.documentoVendaId) {
          const anexosApolice = await fetchAnexos('documento_venda', endosso.documentoVendaId);
          listaAnexos = [...listaAnexos, ...anexosApolice];
        }
      }

      // SEGURANÇA: Gerar URLs assinadas com validação de tenant
      const anexosComUrl = await Promise.all(
        listaAnexos.map(async (anexo) => {
          let urlAssinada: string | null = null;
          try {
            urlAssinada = await storageService.getSignedUrl(
              anexo.id,
              request.corretoraId,
            ) ?? null;
          } catch {
            // URL assinada pode não estar disponível em ambientes sem storage
          }
          return { ...anexo, urlAssinada };
        }),
      );

      return reply.send(anexosComUrl);
    },
  );

  /**
   * POST /api/anexos/:id/new-version
   * Upload de nova versão de arquivo
   */
  fastify.post(
    '/:id/new-version',
    {
      schema: {
        tags: ['Anexos'],
        summary: 'Nova versão',
        description: 'Faz upload de uma nova versão do arquivo',
        params: z.object({ id: z.string().uuid() }),
      },
      preHandler: [authorize(['vendas:criar_cotacao'])],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      // Verificar se anexo pertence ao tenant
      const anexoExistente = await db.query.anexos.findFirst({
        where: and(
          eq(anexos.id, id),
          eq(anexos.corretoraId, request.corretoraId),
          isNull(anexos.deletedAt),
        ),
      });

      if (!anexoExistente) {
        throw new NotFoundError('Anexo');
      }

      await assertEntityOwnership(
        request,
        anexoExistente.entidadeTipo,
        anexoExistente.entidadeId,
      );

      // Receber arquivo
      const parts = request.parts();
      let fileBuffer: Buffer | null = null;

      for await (const part of parts) {
        if (part.type === 'file') {
          fileBuffer = await part.toBuffer();
          break;
        }
      }

      if (!fileBuffer) {
        return reply.status(400).send({
          error: 'Nenhum arquivo foi enviado',
        });
      }

      const buffer = fileBuffer;

      // Upload nova versão
      const result = await storageService.uploadNewVersion(
        id,
        buffer,
        request.user.sub,
      );

      return reply.status(201).send(result);
    },
  );

  /**
   * GET /api/anexos/:id/versions
   * Listar histórico de versões
   */
  fastify.get(
    '/:id/versions',
    {
      schema: {
        tags: ['Anexos'],
        summary: 'Histórico de versões',
        description: 'Lista todas as versões de um arquivo',
        params: z.object({ id: z.string().uuid() }),
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      // Verificar se anexo pertence ao tenant
      const anexoPrincipal = await db.query.anexos.findFirst({
        where: and(
          eq(anexos.id, id),
          eq(anexos.corretoraId, request.corretoraId),
          isNull(anexos.deletedAt),
        ),
      });

      if (!anexoPrincipal) {
        throw new NotFoundError('Anexo');
      }

      await assertEntityOwnership(
        request,
        anexoPrincipal.entidadeTipo,
        anexoPrincipal.entidadeId,
      );

      // Buscar todas as versões (incluindo versões anteriores e posteriores)
      const versoes = await db.query.anexos.findMany({
        where: and(
          eq(anexos.corretoraId, request.corretoraId),
          eq(anexos.entidadeId, anexoPrincipal.entidadeId),
          eq(anexos.entidadeTipo, anexoPrincipal.entidadeTipo),
          eq(anexos.nomeOriginal, anexoPrincipal.nomeOriginal),
          isNull(anexos.deletedAt),
        ),
        with: {
          uploadPor: {
            columns: {
              id: true,
              nome: true,
              email: true,
            },
          },
        },
        orderBy: (anexos, { desc }) => [desc(anexos.versao)],
      });

      return reply.send(versoes);
    },
  );

  /**
   * POST /api/anexos/:id/extract-pdf
   * Extrair texto de PDF
   */
  fastify.post(
    '/:id/extract-pdf',
    {
      schema: {
        tags: ['Anexos'],
        summary: 'Extrair texto de PDF',
        description: 'Extrai texto e metadados de um arquivo PDF',
        params: z.object({ id: z.string().uuid() }),
      },
      preHandler: [authorize(['vendas:criar_cotacao'])],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const anexo = await db.query.anexos.findFirst({
        where: and(
          eq(anexos.id, id),
          eq(anexos.corretoraId, request.corretoraId),
          isNull(anexos.deletedAt),
        ),
      });

      if (!anexo) {
        throw new NotFoundError('Anexo');
      }

      await assertEntityOwnership(request, anexo.entidadeTipo, anexo.entidadeId);

      if (anexo.mimeType !== 'application/pdf') {
        return reply.status(400).send({
          success: false,
          error: 'Apenas PDFs podem ter texto extraído',
        });
      }

      // Download do PDF
      const buffer = await storageService.downloadFile(id);

      // Extrair texto
      const extracted = await pdfExtractor.extract(buffer);

      // Salvar no banco
      await db
        .update(anexos)
        .set({
          textoExtraido: pdfExtractor.cleanText(extracted.text),
          metadadosExtracao: extracted.metadata,
        })
        .where(eq(anexos.id, id));

      return reply.send({
        success: true,
        data: {
          texto: extracted.text,
          metadata: extracted.metadata,
        },
      });
    },
  );
};

export default anexosRoutes;
