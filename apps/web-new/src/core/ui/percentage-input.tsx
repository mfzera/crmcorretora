
import * as React from 'react';
import { Input } from '@/core/ui/input';
import { cn } from '@/core/utils';

export interface PercentageInputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'onChange' | 'value'
  > {
  value?: string | number;
  onChange?: (value: string) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
}

const PercentageInput = React.forwardRef<
  HTMLInputElement,
  PercentageInputProps
>(({ className, value, onChange, onBlur, ...props }, ref) => {
  // Format number to percentage display
  const formatPercentage = (num: number): string => {
    return num.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Parse percentage string to number
  const parsePercentage = (str: string): number => {
    // Remove tudo exceto números e vírgula
    const cleaned = str.replace(/[^\d,]/g, '');
    // Substitui vírgula por ponto
    const normalized = cleaned.replace(',', '.');
    const parsed = parseFloat(normalized) || 0;
    // Limitar a 100
    return Math.min(parsed, 100);
  };

  // Initialize with formatted value
  const getInitialDisplayValue = () => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value || 0;
    if (!isNaN(numValue)) {
      return formatPercentage(numValue);
    }
    return '0,00';
  };

  const [displayValue, setDisplayValue] = React.useState(
    getInitialDisplayValue,
  );
  const [isFocused, setIsFocused] = React.useState(false);

  // Update display value when external value changes
  React.useEffect(() => {
    if (!isFocused) {
      const numValue =
        typeof value === 'string' ? parseFloat(value) : value || 0;
      if (!isNaN(numValue)) {
        setDisplayValue(formatPercentage(numValue));
      } else {
        setDisplayValue('0,00');
      }
    }
  }, [value, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    // Permitir apenas números, vírgula e ponto
    const sanitized = inputValue.replace(/[^\d,.]/g, '');

    setDisplayValue(sanitized);

    // Converter para número e notificar mudança
    const numValue = parsePercentage(sanitized);
    onChange?.(numValue.toString());
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    // Selecionar todo o texto ao focar
    e.target.select();
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);

    // Formatar valor ao perder foco
    const numValue = parsePercentage(displayValue);
    setDisplayValue(formatPercentage(numValue));

    // Notificar com o valor numérico limpo
    onChange?.(numValue.toString());
    onBlur?.(e);
  };

  return (
    <div className="relative">
      <Input
        ref={ref}
        type="text"
        inputMode="decimal"
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={cn('pr-8', className)}
        {...props}
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
        %
      </span>
    </div>
  );
});

PercentageInput.displayName = 'PercentageInput';

export { PercentageInput };
