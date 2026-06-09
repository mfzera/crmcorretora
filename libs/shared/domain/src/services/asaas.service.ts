const ASAAS_API_URL = () =>
  process.env['ASAAS_API_URL'] || 'https://api-sandbox.asaas.com/v3';
const ASAAS_API_KEY = () => process.env['ASAAS_API_KEY'] || '';

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type AsaasBillingType = 'BOLETO' | 'PIX' | 'CREDIT_CARD' | 'UNDEFINED';
export type AsaasCycle = 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUALLY' | 'YEARLY';

export type AsaasPaymentStatus =
  | 'PENDING'
  | 'RECEIVED'
  | 'CONFIRMED'
  | 'OVERDUE'
  | 'REFUNDED'
  | 'RECEIVED_IN_CASH'
  | 'CHARGEBACK_REQUESTED'
  | 'CHARGEBACK_DISPUTE'
  | 'AWAITING_CHARGEBACK_REVERSAL'
  | 'DUNNING_REQUESTED'
  | 'DUNNING_RECEIVED'
  | 'AWAITING_RISK_ANALYSIS';

export interface AsaasCustomer {
  id: string;
  name: string;
  cpfCnpj: string;
  email: string;
  phone?: string;
  mobilePhone?: string;
  address?: string;
  addressNumber?: string;
  complement?: string;
  province?: string;
  city?: string;
  state?: string;
  postalCode?: string;
}

export interface AsaasSubscription {
  id: string;
  customer: string;
  billingType: AsaasBillingType;
  value: number;
  nextDueDate: string;
  cycle: AsaasCycle;
  status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED';
  description?: string;
  externalReference?: string;
  trialEndDate?: string;
  // Preenchido pelo Asaas ao criar assinatura com cartão de crédito
  creditCard?: {
    creditCardToken: string;
    creditCardBrand: string;
    creditCardNumber: string; // últimos 4 dígitos
  };
}

export interface AsaasPayment {
  id: string;
  customer: string;
  subscription?: string;
  billingType: AsaasBillingType;
  status: AsaasPaymentStatus;
  value: number;
  dueDate: string;
  paymentDate?: string;
  bankSlipUrl?: string;
  invoiceUrl?: string;
  pixQrCode?: {
    encodedImage: string;
    payload: string;
    expirationDate: string;
  };
}

// ─── Erro tipado ──────────────────────────────────────────────────────────────

export interface AsaasErrorDetail {
  code: string;
  description: string;
}

export class AsaasApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly errors: AsaasErrorDetail[],
  ) {
    const details = errors.map((e) => `[${e.code}] ${e.description}`).join('; ');
    super(`Asaas API error ${statusCode}: ${details}`);
    this.name = 'AsaasApiError';
  }

  hasCode(code: string): boolean {
    return this.errors.some((e) => e.code === code);
  }
}

// ─── Helper HTTP ──────────────────────────────────────────────────────────────

const ASAAS_TIMEOUT_MS = 15_000;
const ASAAS_MAX_RETRIES = 2;
const ASAAS_RETRY_DELAY_MS = 1_000;

async function asaasFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const apiKey = ASAAS_API_KEY();
  if (!apiKey) {
    throw new Error(
      'ASAAS_API_KEY não configurada. Verifique o .env (use aspas simples ao redor do valor: ASAAS_API_KEY=\'$aact_...\')',
    );
  }

  const method = (options.method ?? 'GET').toUpperCase();
  // Só retenta métodos idempotentes para evitar duplicatas
  const maxAttempts = method === 'GET' ? ASAAS_MAX_RETRIES + 1 : 1;

  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, ASAAS_RETRY_DELAY_MS * attempt));
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), ASAAS_TIMEOUT_MS);

    try {
      const response = await fetch(`${ASAAS_API_URL()}${path}`, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'ecotech-sys',
          access_token: apiKey,
          ...options.headers,
        },
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        let errors: AsaasErrorDetail[] = [];
        try {
          const body = await response.json() as { errors?: AsaasErrorDetail[] };
          errors = body.errors ?? [];
        } catch {
          errors = [{ code: 'unknown', description: `HTTP ${response.status}` }];
        }
        // Não retenta erros de cliente (4xx)
        if (response.status >= 400 && response.status < 500) {
          throw new AsaasApiError(response.status, errors);
        }
        lastError = new AsaasApiError(response.status, errors);
        continue;
      }

      return response.json() as Promise<T>;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof AsaasApiError) throw err;
      lastError = err;
    }
  }

  throw lastError;
}

// ─── Customers ────────────────────────────────────────────────────────────────

export async function createAsaasCustomer(params: {
  name: string;
  cpfCnpj: string;
  email: string;
  phone?: string;
  mobilePhone?: string;
  address?: string;
  addressNumber?: string;
  complement?: string;
  province?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  externalReference?: string;
}): Promise<AsaasCustomer> {
  return asaasFetch<AsaasCustomer>('/customers', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function getAsaasCustomer(customerId: string): Promise<AsaasCustomer> {
  return asaasFetch<AsaasCustomer>(`/customers/${customerId}`);
}

// ─── Subscriptions ────────────────────────────────────────────────────────────

export async function createAsaasSubscription(params: {
  customer: string;
  billingType: AsaasBillingType;
  value: number;
  nextDueDate: string; // YYYY-MM-DD
  cycle: AsaasCycle;
  description?: string;
  externalReference?: string;
  trialEndDate?: string; // YYYY-MM-DD
  creditCard?: {
    holderName: string;
    number: string;
    expiryMonth: string;
    expiryYear: string;
    ccv: string;
  };
  creditCardHolderInfo?: {
    name: string;
    email: string;
    cpfCnpj: string;
    postalCode: string;
    addressNumber: string;
    addressComplement?: string;
    phone?: string;
    mobilePhone?: string;
  };
}): Promise<AsaasSubscription> {
  return asaasFetch<AsaasSubscription>('/subscriptions', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function updateAsaasSubscription(
  subscriptionId: string,
  params: {
    billingType?: AsaasBillingType;
    value?: number;
    nextDueDate?: string;
    cycle?: AsaasCycle;
    description?: string;
    status?: 'ACTIVE' | 'INACTIVE';
  },
): Promise<AsaasSubscription> {
  return asaasFetch<AsaasSubscription>(`/subscriptions/${subscriptionId}`, {
    method: 'PUT',
    body: JSON.stringify(params),
  });
}

export async function cancelAsaasSubscription(
  subscriptionId: string,
): Promise<void> {
  await asaasFetch(`/subscriptions/${subscriptionId}`, { method: 'DELETE' });
}

export async function getAsaasSubscription(
  subscriptionId: string,
): Promise<AsaasSubscription> {
  return asaasFetch<AsaasSubscription>(`/subscriptions/${subscriptionId}`);
}

// ─── Payments ─────────────────────────────────────────────────────────────────

export async function listAsaasPayments(params: {
  subscriptionId?: string;
  customerId?: string;
  limit?: number;
  offset?: number;
}): Promise<{ data: AsaasPayment[]; totalCount: number }> {
  const query = new URLSearchParams();
  if (params.subscriptionId) query.set('subscription', params.subscriptionId);
  if (params.customerId) query.set('customer', params.customerId);
  if (params.limit) query.set('limit', params.limit.toString());
  if (params.offset) query.set('offset', params.offset.toString());

  return asaasFetch<{ data: AsaasPayment[]; totalCount: number }>(
    `/payments?${query.toString()}`,
  );
}

export async function getAsaasPayment(paymentId: string): Promise<AsaasPayment> {
  return asaasFetch<AsaasPayment>(`/payments/${paymentId}`);
}

export async function getAsaasPaymentPixQrCode(
  paymentId: string,
): Promise<{ encodedImage: string; payload: string; expirationDate: string }> {
  return asaasFetch(`/payments/${paymentId}/pixQrCode`);
}

export async function createAsaasPayment(params: {
  customer: string;
  billingType: AsaasBillingType;
  value: number;
  dueDate: string; // YYYY-MM-DD
  description?: string;
  externalReference?: string;
  creditCard?: {
    holderName: string;
    number: string;
    expiryMonth: string;
    expiryYear: string;
    ccv: string;
  };
  creditCardHolderInfo?: {
    name: string;
    email: string;
    cpfCnpj: string;
    postalCode: string;
    addressNumber: string;
    addressComplement?: string;
    phone?: string;
    mobilePhone?: string;
  };
}): Promise<AsaasPayment> {
  return asaasFetch<AsaasPayment>('/payments', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

// ─── Webhooks ─────────────────────────────────────────────────────────────────

export type AsaasWebhookEvent =
  | 'PAYMENT_CREATED'
  | 'PAYMENT_UPDATED'
  | 'PAYMENT_CONFIRMED'
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_OVERDUE'
  | 'PAYMENT_DELETED'
  | 'PAYMENT_RESTORED'
  | 'PAYMENT_REFUNDED'
  | 'SUBSCRIPTION_CREATED'
  | 'SUBSCRIPTION_UPDATED'
  | 'SUBSCRIPTION_DELETED'
  | 'SUBSCRIPTION_RENEWED';

export interface AsaasWebhookPayload {
  event: AsaasWebhookEvent;
  payment?: AsaasPayment;
  subscription?: AsaasSubscription;
}

export function validateAsaasWebhook(
  headerToken: string | undefined,
): boolean {
  const expectedToken = process.env['ASAAS_WEBHOOK_TOKEN'];
  if (!expectedToken) {
    console.error('ASAAS_WEBHOOK_TOKEN não configurado — rejeitando webhook');
    return false;
  }
  return headerToken === expectedToken;
}
