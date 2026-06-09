import { z } from 'zod';
import { routeDoc } from '../index.js';

const errorResponse = z.object({ error: z.string() });

export const asaasDocs = {
  checkSubdominio: routeDoc({
    querystring: z.object({
      subdominio: z.string().min(3).describe('Subdomínio a verificar (mínimo 3 caracteres)'),
    }),
    response: {
      200: z.object({ available: z.boolean().describe('true se o subdomínio estiver disponível') }),
      400: errorResponse,
    },
  }),

  checkout: routeDoc({
    body: z.object({
      razaoSocial: z.string(),
      cnpj: z.string().describe('CNPJ da corretora (com ou sem máscara)'),
      email: z.string().email().describe('E-mail de contato da corretora'),
      telefone: z.string().optional(),
      cep: z.string(),
      logradouro: z.string(),
      numero: z.string(),
      complemento: z.string().optional(),
      bairro: z.string(),
      cidade: z.string(),
      uf: z.string().length(2),
      subdominio: z.string().optional().describe('Subdomínio personalizado (gerado automaticamente se omitido)'),
      nomeResponsavel: z.string(),
      emailResponsavel: z.string().email(),
      telefoneResponsavel: z.string().optional(),
      senha: z.string().min(8),
      users: z.number().int().min(1).describe('Número de usuários contratados'),
      planCycle: z.enum(['TRIENAL', 'ANUAL', 'SEMESTRAL', 'MENSAL']).optional().describe('Ciclo do plano (padrão: TRIENAL)'),
      billingType: z.enum(['BOLETO', 'PIX', 'CREDIT_CARD']),
      creditCard: z.object({
        holderName: z.string(),
        number: z.string(),
        expiryMonth: z.string(),
        expiryYear: z.string(),
        ccv: z.string(),
      }).optional().describe('Obrigatório quando billingType=CREDIT_CARD'),
    }),
    response: {
      201: z.object({
        success: z.literal(true),
        data: z.object({
          corretora: z.object({
            id: z.string().uuid(),
            razaoSocial: z.string(),
            subdominio: z.string(),
          }),
          usuario: z.object({ id: z.string().uuid(), email: z.string() }),
          paymentInfo: z.object({
            billingType: z.string(),
            bankSlipUrl: z.string().optional().describe('URL do boleto (billingType=BOLETO)'),
            pixEncodedImage: z.string().optional().describe('QR Code base64 (billingType=PIX)'),
            pixPayload: z.string().optional().describe('Copia-e-cola PIX'),
          }),
        }),
      }),
      400: errorResponse,
      402: errorResponse,
      409: errorResponse,
      429: errorResponse,
      500: errorResponse,
      502: errorResponse,
      503: errorResponse,
    },
  }),

  webhook: routeDoc({
    response: {
      200: z.object({ received: z.literal(true) }),
      401: errorResponse,
      500: errorResponse,
    },
  }),

  subscription: routeDoc({
    response: {
      200: z.object({
        success: z.literal(true),
        data: z.unknown().describe('Detalhes da assinatura ativa da corretora'),
      }),
      401: errorResponse,
      404: errorResponse,
      500: errorResponse,
    },
  }),
};
