/**
 * Validações de CPF e CNPJ
 */

// Remove caracteres não numéricos
export function digitsOnly(valor: string | undefined | null): string {
  if (!valor) return '';
  return valor.replace(/\D/g, '');
}

// Valida CPF
export function validateCPF(cpf: string): boolean {
  cpf = digitsOnly(cpf);

  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false; // Todos dígitos iguais

  let soma = 0;
  let resto;

  // Valida primeiro dígito verificador
  for (let i = 1; i <= 9; i++) {
    soma += parseInt(cpf.substring(i - 1, i)) * (11 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.substring(9, 10))) return false;

  soma = 0;
  // Valida segundo dígito verificador
  for (let i = 1; i <= 10; i++) {
    soma += parseInt(cpf.substring(i - 1, i)) * (12 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.substring(10, 11))) return false;

  return true;
}

// Valida CNPJ
export function validateCNPJ(cnpj: string): boolean {
  cnpj = digitsOnly(cnpj);

  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false; // Todos dígitos iguais

  let tamanho = cnpj.length - 2;
  let numeros = cnpj.substring(0, tamanho);
  const digitos = cnpj.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;

  // Valida primeiro dígito verificador
  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(0))) return false;

  tamanho = tamanho + 1;
  numeros = cnpj.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;

  // Valida segundo dígito verificador
  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(1))) return false;

  return true;
}

// Valida CPF ou CNPJ
export function validateDocument(documento: string, tipo: 'CPF' | 'CNPJ'): boolean {
  if (tipo === 'CPF') {
    return validateCPF(documento);
  }
  return validateCNPJ(documento);
}

// Formata CPF: 999.999.999-99
export function formatCPF(cpf: string): string {
  cpf = digitsOnly(cpf);
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

// Formata CNPJ: 99.999.999/9999-99
export function formatCNPJ(cnpj: string): string {
  cnpj = digitsOnly(cnpj);
  return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

// Formata documento (CPF ou CNPJ)
export function formatDocument(documento: string): string {
  const numeros = digitsOnly(documento);
  if (numeros.length <= 11) {
    return formatCPF(numeros);
  }
  return formatCNPJ(numeros);
}

// Formata CEP: 99999-999
export function formatCEP(cep: string): string {
  cep = digitsOnly(cep);
  return cep.replace(/(\d{5})(\d{3})/, '$1-$2');
}

// Formata telefone: (99) 9999-9999 ou (99) 99999-9999
export function formatPhone(telefone: string | undefined | null): string {
  if (!telefone) return '';
  const numeros = digitsOnly(telefone);
  if (!numeros) return '';
  if (numeros.length === 11) {
    return numeros.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  return numeros.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
}
