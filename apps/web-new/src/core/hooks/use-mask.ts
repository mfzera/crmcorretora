import { useState, useCallback } from 'react';
import {
  digitsOnly,
  formatCPF,
  formatCNPJ,
  formatCEP,
  formatPhone,
} from '@/core/validators/documento';

export type MaskType = 'cpf' | 'cnpj' | 'telefone' | 'cep' | 'none';

export function useMask(initialValue = '', maskType: MaskType = 'none') {
  const [value, setValue] = useState(initialValue);

  const applyMask = useCallback((rawValue: string, type: MaskType): string => {
    const numbersOnly = digitsOnly(rawValue);

    switch (type) {
      case 'cpf':
        return formatCPF(numbersOnly.slice(0, 11));
      case 'cnpj':
        return formatCNPJ(numbersOnly.slice(0, 14));
      case 'telefone':
        return formatPhone(numbersOnly.slice(0, 11));
      case 'cep':
        return formatCEP(numbersOnly.slice(0, 8));
      default:
        return rawValue;
    }
  }, []);

  const handleChange = useCallback((newValue: string) => {
    const masked = applyMask(newValue, maskType);
    setValue(masked);
    return masked;
  }, [maskType, applyMask]);

  const getRawValue = useCallback(() => {
    return digitsOnly(value);
  }, [value]);

  return {
    value,
    setValue,
    handleChange,
    getRawValue,
  };
}
