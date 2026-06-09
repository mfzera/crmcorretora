
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/core/ui/select';
import { useTiposSeguro } from '../http';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function TipoSeguroSelect({ value, onChange, placeholder = 'Selecionar tipo...', disabled }: Props) {
  const { data: tipos = [], isLoading } = useTiposSeguro();

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled || isLoading}>
      <SelectTrigger>
        <SelectValue placeholder={isLoading ? 'Carregando...' : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {tipos.map((tipo) => (
          <SelectItem key={tipo} value={tipo}>
            {tipo}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
