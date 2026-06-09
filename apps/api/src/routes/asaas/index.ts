import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { asaasDocs } from '../../docs/asaas/schemas.js';
import bcrypt from 'bcryptjs';
import {
  db,
  corretoras,
  planos,
  usuarios,
  cargos,
  cargoPermissoes,
  permissoesGlobais,
  produtos,
  usuarioCorretora,
  subscriptions,
} from '@ecotech/shared/database';
import { eq, and } from 'drizzle-orm';
import * as asaasService from '@ecotech/shared/domain';
import { AsaasApiError } from '@ecotech/shared/domain';
import * as subscriptionService from '@ecotech/shared/domain';
import {
  calculatePlanBill,
  calculatePlanTotal,
  PLAN_CONFIGS,
  type PlanCycle,
  isValidCNPJ,
  cleanDocument,
  CARGOS_PADRAO,
  getPermissaoIdsByNames,
} from '@ecotech/shared/utils';

function gerarSubdominio(razaoSocial: string): string {
  return razaoSocial
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .substring(0, 50);
}

const asaasRoutes: FastifyPluginAsyncZod = async function (fastify) {
  /**
   * GET /asaas/check-subdominio?subdominio=xxx
   */
  fastify.get('/check-subdomain', {
    schema: {
      tags: ['Asaas'],
      summary: 'Verificar disponibilidade de subdomínio',
      description: 'Verifica se um subdomínio está disponível para cadastro. Mínimo 3 caracteres.',
      security: [],
      ...asaasDocs.checkSubdominio,
    },
  }, async (request, reply) => {
    const { subdominio } = request.query as { subdominio?: string };
    if (!subdominio || subdominio.length < 3) {
      return reply.code(400).send({ error: 'Subdomínio inválido' });
    }
    const exists = await db.query.corretoras.findFirst({
      where: eq(corretoras.subdominio, subdominio.toLowerCase()),
      columns: { id: true },
    });
    return reply.send({ available: !exists });
  });

  /**
   * POST /asaas/checkout
   * Cria corretora + usuário + cliente Asaas + assinatura Asaas em uma única chamada.
   * Não requer autenticação — é o endpoint público de cadastro.
   */
  fastify.post('/checkout', {
    schema: {
      tags: ['Asaas'],
      summary: 'Criar conta (checkout)',
      description: 'Endpoint público sem autenticação que cria corretora, usuário admin, cliente Asaas e assinatura em uma única transação. Rate limit: 5 req / 10 min.',
      security: [],
      ...asaasDocs.checkout,
    },
    config: {
      rateLimit: {
        max: 5,
        timeWindow: '10 minutes',
      },
    },
  }, async (request, reply) => {
    try {
      const body = request.body as {
        razaoSocial: string;
        cnpj: string;
        email: string;
        telefone?: string;
        cep: string;
        logradouro: string;
        numero: string;
        complemento?: string;
        bairro: string;
        cidade: string;
        uf: string;
        subdominio?: string;
        nomeResponsavel: string;
        emailResponsavel: string;
        telefoneResponsavel?: string;
        senha: string;
        users: number;
        planCycle?: PlanCycle;
        billingType: 'BOLETO' | 'PIX' | 'CREDIT_CARD';
        modulosAtivos?: string[];
        creditCard?: {
          holderName: string;
          number: string;
          expiryMonth: string;
          expiryYear: string;
          ccv: string;
        };
      };

      const cnpjClean = cleanDocument(body.cnpj);

      if (!isValidCNPJ(cnpjClean)) {
        return reply.code(400).send({ error: 'CNPJ inválido' });
      }

      if (!body.senha || body.senha.length < 8) {
        return reply.code(400).send({ error: 'Senha deve ter no mínimo 8 caracteres' });
      }

      // Verificar CNPJ duplicado
      const cnpjExists = await db.query.corretoras.findFirst({
        where: eq(corretoras.cnpj, cnpjClean),
      });
      if (cnpjExists) {
        return reply.code(409).send({ error: 'CNPJ já cadastrado' });
      }

      // Verificar email duplicado
      const emailExists = await db.query.usuarios.findFirst({
        where: eq(usuarios.email, body.emailResponsavel.toLowerCase()),
      });
      if (emailExists) {
        return reply.code(409).send({ error: 'E-mail já cadastrado' });
      }

      // Buscar plano ativo
      const plano = await db.query.planos.findFirst({
        where: eq(planos.ativo, true),
      });
      if (!plano) {
        return reply.code(400).send({ error: 'Nenhum plano disponível' });
      }

      // Gerar/validar subdomínio
      const customSubdominio = body.subdominio?.trim();
      let subdominio: string;

      if (customSubdominio) {
        subdominio = gerarSubdominio(customSubdominio);
        const exists = await db.query.corretoras.findFirst({
          where: eq(corretoras.subdominio, subdominio),
          columns: { id: true },
        });
        if (exists) {
          return reply.code(409).send({ error: 'Este subdomínio já está em uso. Escolha outro.' });
        }
      } else {
        // Auto-gerar com sufixo incremental
        subdominio = gerarSubdominio(body.razaoSocial);
        const base = subdominio;
        let suffix = 0;
        while (true) {
          const exists = await db.query.corretoras.findFirst({
            where: eq(corretoras.subdominio, subdominio),
            columns: { id: true },
          });
          if (!exists) break;
          suffix++;
          subdominio = `${base}-${suffix}`;
        }
      }

      const planCycle: PlanCycle = body.planCycle ?? 'TRIENAL';
      const planCfg = PLAN_CONFIGS[planCycle];
      const totalMonthly = calculatePlanBill(body.users, planCycle);
      const totalPeriodic = calculatePlanTotal(body.users, planCycle);

      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 7);
      const trialEndStr = trialEndDate.toISOString().split('T')[0];

      // 1. Criar cliente no Asaas
      const asaasCustomer = await asaasService.createAsaasCustomer({
        name: body.razaoSocial,
        cpfCnpj: cnpjClean,
        email: body.email,
        phone: body.telefone,
        address: body.logradouro,
        addressNumber: body.numero,
        complement: body.complemento,
        province: body.bairro,
        city: body.cidade,
        state: body.uf,
        postalCode: body.cep.replace(/\D/g, ''),
        externalReference: cnpjClean,
      });

      // 2. Criar cobrança no Asaas (assinatura ou pagamento avulso para TRIENAL)
      let asaasSubscriptionId: string | null = null;
      let asaasPaymentId: string | null = null;
      let asaasCreditCardToken: string | null = null;
      let firstPaymentId: string | null = null; // para buscar PIX/boleto depois

      if (planCycle === 'TRIENAL') {
        // Plano trienal: cobrança avulsa de 36 meses, vence após o trial
        const paymentPayload: Parameters<typeof asaasService.createAsaasPayment>[0] = {
          customer: asaasCustomer.id,
          billingType: body.billingType,
          value: totalPeriodic,
          dueDate: trialEndStr,
          description: `EcoTech ${planCfg.label} - ${body.users} usuário${body.users > 1 ? 's' : ''}`,
          externalReference: cnpjClean,
        };
        if (body.billingType === 'CREDIT_CARD' && body.creditCard) {
          paymentPayload.creditCard = body.creditCard;
          paymentPayload.creditCardHolderInfo = {
            name: body.nomeResponsavel,
            email: body.emailResponsavel,
            cpfCnpj: cnpjClean,
            postalCode: body.cep.replace(/\D/g, ''),
            addressNumber: body.numero,
            ...(body.complemento ? { addressComplement: body.complemento } : {}),
            ...(body.telefoneResponsavel ? { phone: body.telefoneResponsavel } : {}),
          };
        }
        const asaasPayment = await asaasService.createAsaasPayment(paymentPayload);
        asaasPaymentId = asaasPayment.id;
        firstPaymentId = asaasPayment.id;
      } else {
        // Planos recorrentes: assinatura
        const subscriptionPayload: Parameters<typeof asaasService.createAsaasSubscription>[0] = {
          customer: asaasCustomer.id,
          billingType: body.billingType,
          value: totalPeriodic,
          nextDueDate: trialEndStr,
          cycle: planCfg.asaasCycle!,
          description: `EcoTech ${planCfg.label} - ${body.users} usuário${body.users > 1 ? 's' : ''}`,
          trialEndDate: trialEndStr,
        };
        if (body.billingType === 'CREDIT_CARD' && body.creditCard) {
          subscriptionPayload.creditCard = body.creditCard;
          subscriptionPayload.creditCardHolderInfo = {
            name: body.nomeResponsavel,
            email: body.emailResponsavel,
            cpfCnpj: cnpjClean,
            postalCode: body.cep.replace(/\D/g, ''),
            addressNumber: body.numero,
            ...(body.complemento ? { addressComplement: body.complemento } : {}),
            ...(body.telefoneResponsavel ? { phone: body.telefoneResponsavel } : {}),
          };
        }
        const asaasSubscription = await asaasService.createAsaasSubscription(subscriptionPayload);
        asaasSubscriptionId = asaasSubscription.id;
        asaasCreditCardToken = asaasSubscription.creditCard?.creditCardToken ?? null;
      }

      // 3. Criar corretora + usuário + subscription no banco (transação)
      const result = await db.transaction(async (tx) => {
        const [corretora] = await tx.insert(corretoras).values({
          planoId: plano.id,
          razaoSocial: body.razaoSocial,
          nomeFantasia: body.razaoSocial,
          cnpj: cnpjClean,
          subdominio,
          emailContato: body.email,
          telefone: body.telefone,
          status: 'TRIAL',
          dataInicioTrial: new Date(),
          dataFimTrial: trialEndDate,
          usuariosAtivos: 1,
          vendedoresAtivos: 0,
          clientesCadastrados: 0,
          vendasMesAtual: 0,
        }).returning();

        const allPermissions = await tx.select().from(permissoesGlobais);

        // Cargo Admin
        const [cargoAdmin] = await tx.insert(cargos).values({
          corretoraId: corretora.id,
          nomeCargo: 'Administrador',
          descricao: 'Dono da corretora - acesso total ao sistema',
          isAdmin: true,
          isGestor: false,
          isVendedor: false,
        }).returning();

        if (allPermissions.length > 0) {
          await tx.insert(cargoPermissoes).values(
            allPermissions.map((p) => ({ cargoId: cargoAdmin.id, permissaoGlobalId: p.id })),
          );
        }

        // Cargo Gerente
        const gerenteDef = CARGOS_PADRAO.GERENTE;
        const [cargoGerente] = await tx.insert(cargos).values({
          corretoraId: corretora.id,
          nomeCargo: gerenteDef.nomeCargo,
          descricao: gerenteDef.descricao,
          isAdmin: false,
          isGestor: gerenteDef.isGestor,
          isVendedor: gerenteDef.isVendedor,
        }).returning();
        const gerenteIds = getPermissaoIdsByNames(gerenteDef.permissoes, allPermissions);
        if (gerenteIds.length > 0) {
          await tx.insert(cargoPermissoes).values(
            gerenteIds.map((id) => ({ cargoId: cargoGerente.id, permissaoGlobalId: id })),
          );
        }

        // Cargo Vendedor
        const vendedorDef = CARGOS_PADRAO.VENDEDOR;
        const [cargoVendedor] = await tx.insert(cargos).values({
          corretoraId: corretora.id,
          nomeCargo: vendedorDef.nomeCargo,
          descricao: vendedorDef.descricao,
          isAdmin: false,
          isGestor: vendedorDef.isGestor,
          isVendedor: vendedorDef.isVendedor,
        }).returning();
        const vendedorIds = getPermissaoIdsByNames(vendedorDef.permissoes, allPermissions);
        if (vendedorIds.length > 0) {
          await tx.insert(cargoPermissoes).values(
            vendedorIds.map((id) => ({ cargoId: cargoVendedor.id, permissaoGlobalId: id })),
          );
        }

        // Cargo Cadastro
        const cadastroDef = CARGOS_PADRAO.CADASTRO;
        const [cargoCadastro] = await tx.insert(cargos).values({
          corretoraId: corretora.id,
          nomeCargo: cadastroDef.nomeCargo,
          descricao: cadastroDef.descricao,
          isAdmin: false,
          isGestor: cadastroDef.isGestor,
          isVendedor: cadastroDef.isVendedor,
        }).returning();
        const cadastroIds = getPermissaoIdsByNames(cadastroDef.permissoes, allPermissions);
        if (cadastroIds.length > 0) {
          await tx.insert(cargoPermissoes).values(
            cadastroIds.map((id) => ({ cargoId: cargoCadastro.id, permissaoGlobalId: id })),
          );
        }

        // Usuário dono
        const passwordHash = await bcrypt.hash(body.senha, 10);
        const [dono] = await tx.insert(usuarios).values({
          corretoraId: corretora.id,
          cargoId: cargoAdmin.id,
          nome: body.nomeResponsavel,
          email: body.emailResponsavel.toLowerCase(),
          passwordHash,
          ativo: true,
          primeiroAcesso: true,
        }).returning();

        await tx.insert(usuarioCorretora).values({
          usuarioId: dono.id,
          corretoraId: corretora.id,
          cargoId: cargoAdmin.id,
          ativo: true,
          dataVinculo: new Date(),
        });

        // Produtos padrão
        await tx.insert(produtos).values([
          { corretoraId: corretora.id, nomeProduto: 'Seguro Auto', tipoSeguro: 'AUTO', percentualComissaoPadrao: '20.00', ativo: true },
          { corretoraId: corretora.id, nomeProduto: 'Seguro Residencial', tipoSeguro: 'RESIDENCIAL', percentualComissaoPadrao: '15.00', ativo: true },
          { corretoraId: corretora.id, nomeProduto: 'Seguro Vida', tipoSeguro: 'VIDA', percentualComissaoPadrao: '25.00', ativo: true },
        ]);

        // Subscription vinculada ao Asaas
        const periodEndDate = new Date(trialEndDate);
        if (planCycle === 'TRIENAL') {
          periodEndDate.setFullYear(periodEndDate.getFullYear() + 3);
        }

        const [subscription] = await tx.insert(subscriptions).values({
          corretoraId: corretora.id,
          planoId: plano.id,
          planCycle,
          asaasCustomerId: asaasCustomer.id,
          asaasSubscriptionId,
          asaasPaymentId,
          asaasCreditCardToken,
          status: 'TRIAL',
          modulosAtivos: body.modulosAtivos?.length ? body.modulosAtivos : ['crm'],
          seatsIncluded: plano.seatsInclusos ?? 3,
          seatsUsed: 1,
          seatsAdditional: Math.max(0, body.users - (plano.seatsInclusos ?? 3)),
          basePrice: planCfg.basePrice.toString(),
          pricePerSeat: planCfg.pricePerSeat.toString(),
          totalMonthly: totalMonthly.toString(),
          currentPeriodStart: new Date(),
          currentPeriodEnd: planCycle === 'TRIENAL' ? periodEndDate : trialEndDate,
          trialStart: new Date(),
          trialEnd: trialEndDate,
        }).returning();

        return { corretora, dono, subscription };
      });

      // 4. Buscar info de pagamento para PIX/Boleto
      let paymentInfo: {
        billingType: string;
        bankSlipUrl?: string;
        pixEncodedImage?: string;
        pixPayload?: string;
      } = { billingType: body.billingType };

      if (body.billingType === 'BOLETO' || body.billingType === 'PIX') {
        try {
          // Para TRIENAL: já temos o payment diretamente. Para outros: buscar via subscription.
          let targetPaymentId = firstPaymentId;
          if (!targetPaymentId && asaasSubscriptionId) {
            const payments = await asaasService.listAsaasPayments({
              subscriptionId: asaasSubscriptionId,
              limit: 1,
            });
            targetPaymentId = payments.data[0]?.id ?? null;
          }
          if (targetPaymentId) {
            if (body.billingType === 'BOLETO') {
              const payment = await asaasService.getAsaasPayment(targetPaymentId);
              paymentInfo.bankSlipUrl = payment.bankSlipUrl;
            } else if (body.billingType === 'PIX') {
              const pix = await asaasService.getAsaasPaymentPixQrCode(targetPaymentId);
              paymentInfo.pixEncodedImage = pix.encodedImage;
              paymentInfo.pixPayload = pix.payload;
            }
          }
        } catch (paymentErr) {
          fastify.log.warn({ err: paymentErr, asaasSubscriptionId, asaasPaymentId }, 'Falha ao buscar dados de pagamento Asaas (boleto/PIX) — o Asaas enviará por email');
        }
      }

      return reply.status(201).send({
        success: true,
        data: {
          corretora: {
            id: result.corretora.id,
            razaoSocial: result.corretora.razaoSocial,
            subdominio: result.corretora.subdominio,
          },
          usuario: {
            id: result.dono.id,
            email: result.dono.email,
          },
          paymentInfo,
        },
      });
    } catch (error: any) {
      fastify.log.error({ err: error }, 'Erro ao criar checkout');

      if (error instanceof AsaasApiError) {
        if (error.statusCode === 401 || error.hasCode('access_token_not_found') || error.hasCode('invalid_access_token')) {
          return reply.code(503).send({ error: 'Serviço de pagamento indisponível. Tente novamente mais tarde.' });
        }
        if (error.hasCode('cpfCnpj_already_in_use')) {
          return reply.code(409).send({ error: 'CNPJ já possui cadastro no sistema de pagamentos' });
        }
        if (error.hasCode('invalid_cpfCnpj')) {
          return reply.code(400).send({ error: 'CNPJ inválido para o sistema de pagamentos' });
        }
        if (error.hasCode('invalid_creditCard') || error.hasCode('invalid_creditCardHolderInfo')) {
          return reply.code(400).send({ error: 'Dados do cartão de crédito inválidos' });
        }
        if (error.hasCode('creditCard_declined')) {
          return reply.code(402).send({ error: 'Cartão recusado. Verifique os dados ou use outro método de pagamento.' });
        }
        if (error.hasCode('subscription_limit_exceeded') || error.hasCode('payment_limit_exceeded') || error.errors[0]?.description?.toLowerCase().includes('limite')) {
          return reply.code(402).send({ error: 'O valor total excede o limite autorizado para sua conta. Entre em contato com nosso suporte.' });
        }
        // Outros erros de validação do Asaas (4xx) → repassar detalhe ao cliente
        if (error.statusCode >= 400 && error.statusCode < 500) {
          const desc = error.errors[0]?.description ?? 'Erro de validação no pagamento';
          return reply.code(400).send({ error: desc });
        }
        return reply.code(502).send({ error: 'Erro no sistema de pagamentos. Tente novamente.' });
      }

      const isDuplicate =
        error.message?.includes('duplicate') ||
        (error.cause as any)?.message?.includes('duplicate') ||
        (error.cause as any)?.code === '23505';
      if (isDuplicate) {
        return reply.code(409).send({ error: 'CNPJ ou e-mail já cadastrado' });
      }
      return reply.code(500).send({ error: 'Falha ao processar cadastro' });
    }
  });

  /**
   * POST /asaas/webhook
   */
  fastify.post('/webhook', {
    schema: {
      tags: ['Asaas'],
      summary: 'Webhook de eventos Asaas',
      description: 'Receptor de eventos de pagamento enviados pelo Asaas. Valida o header `asaas-access-token` antes de processar. Não requer autenticação JWT.',
      security: [],
      ...asaasDocs.webhook,
    },
  }, async (request, reply) => {
    const token = request.headers['asaas-access-token'] as string | undefined;

    if (!asaasService.validateAsaasWebhook(token)) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    try {
      const payload = request.body as asaasService.AsaasWebhookPayload;
      await subscriptionService.syncSubscriptionFromAsaas(payload);
      return reply.send({ received: true });
    } catch (error) {
      fastify.log.error({ err: error }, 'Erro ao processar webhook Asaas');
      return reply.code(500).send({ error: 'Webhook processing failed' });
    }
  });

  /**
   * GET /asaas/subscription
   */
  fastify.get('/subscription', {
    schema: {
      tags: ['Asaas'],
      summary: 'Detalhes da assinatura da corretora',
      description: 'Retorna os detalhes da assinatura ativa da corretora autenticada via JWT.',
      ...asaasDocs.subscription,
    },
  }, async (request, reply) => {
    try {
      const corretoraId = (request as any).corretoraId as string;

      if (!corretoraId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const details = await subscriptionService.getSubscriptionDetails(corretoraId);

      if (!details) {
        return reply.code(404).send({ error: 'Assinatura não encontrada' });
      }

      return reply.send({ success: true, data: details });
    } catch (error) {
      fastify.log.error({ err: error }, 'Erro ao buscar subscription');
      return reply.code(500).send({ error: 'Erro ao buscar assinatura' });
    }
  });
};

export default asaasRoutes;
