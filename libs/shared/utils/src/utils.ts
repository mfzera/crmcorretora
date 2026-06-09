// NOTE: db import removed to avoid circular dependency with database package
// If you need database utilities, import db where needed instead

// CPF validation
export function isValidCPF(cpf: string): boolean {
  const cleaned = cpf.replace(/\D/g, '');

  if (cleaned.length !== 11) return false;

  // Check for known invalid patterns
  if (/^(\d)\1+$/.test(cleaned)) return false;

  // Validate digits
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned.charAt(i)) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned.charAt(9))) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned.charAt(i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned.charAt(10))) return false;

  return true;
}

// CNPJ validation
export function isValidCNPJ(cnpj: string): boolean {
  const cleaned = cnpj.replace(/\D/g, '');

  if (cleaned.length !== 14) return false;

  // Check for known invalid patterns
  if (/^(\d)\1+$/.test(cleaned)) return false;

  // Validate first digit
  let size = cleaned.length - 2;
  let numbers = cleaned.substring(0, size);
  const digits = cleaned.substring(size);
  let sum = 0;
  let pos = size - 7;

  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;

  // Validate second digit
  size = size + 1;
  numbers = cleaned.substring(0, size);
  sum = 0;
  pos = size - 7;

  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1))) return false;

  return true;
}

// Clean document (CPF/CNPJ)
export function cleanDocument(doc: string): string {
  return doc.replace(/\D/g, '');
}

// Format CPF
export function formatCPF(cpf: string): string {
  const cleaned = cleanDocument(cpf);
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

// Format CNPJ
export function formatCNPJ(cnpj: string): string {
  const cleaned = cleanDocument(cnpj);
  return cleaned.replace(
    /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
    '$1.$2.$3/$4-$5',
  );
}

// Sequential number generator
// interface SequencialParams {
//   tipo: string;
//   corretoraId: string;
//   ano: number;
//   mes: number;
// }
//
// export async function getNextSequencial(params: SequencialParams): Promise<number> {
//   const { tipo, corretoraId, ano, mes } = params;
//   const prefix = `${tipo}_${corretoraId}_${ano}${String(mes).padStart(2, '0')}`;
//
//   // Use advisory lock to ensure thread safety
//   const result = await db.execute(sql`
//     SELECT pg_advisory_xact_lock(hashtext(${prefix}));
//
//     INSERT INTO numero_sequencial (prefix, ultimo_valor)
//     VALUES (${prefix}, 1)
//     ON CONFLICT (prefix)
//     DO UPDATE SET ultimo_valor = numero_sequencial.ultimo_valor + 1
//     RETURNING ultimo_valor;
//   `);
//
//   return (result.rows[0] as { ultimo_valor: number }).ultimo_valor;
// }
//
// Generate document numbers
export function generateNumeroCotacao(
  corretoraId: string,
  sequencial: number,
): string {
  const now = new Date();
  const ano = now.getFullYear();
  const mes = String(now.getMonth() + 1).padStart(2, '0');
  return `COT-${ano}${mes}-${String(sequencial).padStart(5, '0')}`;
}

export function generateNumeroDocumentoVenda(
  tipo: 'COTACAO_DIRETA' | 'PROPOSTA_FORMAL' | 'VENDA_EXPRESSA' | 'COTACAO_PERDIDA',
  sequencial: number,
): string {
  const now = new Date();
  const ano = now.getFullYear();
  const mes = String(now.getMonth() + 1).padStart(2, '0');

  const prefixMap = {
    COTACAO_DIRETA: 'VD-COT',
    PROPOSTA_FORMAL: 'VD-PROP',
    VENDA_EXPRESSA: 'VD-EXP',
    COTACAO_PERDIDA: 'VD-PERD',
  };

  return `${prefixMap[tipo]}-${ano}${mes}-${String(sequencial).padStart(5, '0')}`;
}

export function generateNumeroProposta(sequencial: number): string {
  const now = new Date();
  const ano = now.getFullYear();
  const mes = String(now.getMonth() + 1).padStart(2, '0');
  return `PROP-${ano}${mes}-${String(sequencial).padStart(5, '0')}`;
}

export function generateNumeroEndosso(sequencial: number): string {
  const now = new Date();
  const ano = now.getFullYear();
  const mes = String(now.getMonth() + 1).padStart(2, '0');
  return `END-${ano}${mes}-${String(sequencial).padStart(5, '0')}`;
}

export function generateNumeroSinistro(sequencial: number): string {
  const now = new Date();
  const ano = now.getFullYear();
  const mes = String(now.getMonth() + 1).padStart(2, '0');
  return `SIN-${ano}${mes}-${String(sequencial).padStart(5, '0')}`;
}

// Pagination helper
export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export function getPaginationParams(params: PaginationParams): {
  offset: number;
  limit: number | undefined;
  page: number;
} {
  const page = Math.max(1, params.page || 1);
  // Se limit não foi especificado, retorna undefined para buscar todos
  const limit = params.limit ? Math.max(1, params.limit) : undefined;
  const offset = limit ? (page - 1) * limit : 0;

  return { offset, limit, page };
}

export function createPaginatedResult<T>(
  data: T[],
  total: number,
  page: number,
  limit?: number,
): PaginatedResult<T> {
  const effectiveLimit = limit || total || 1;
  const totalPages = limit ? Math.ceil(total / limit) : 1;

  return {
    data,
    meta: {
      total,
      page,
      limit: effectiveLimit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}
