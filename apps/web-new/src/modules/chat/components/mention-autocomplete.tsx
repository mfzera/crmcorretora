
import { useState, useEffect, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/core/ui/avatar';
import { api } from '@/infra/http/api';

interface Usuario {
  id: string;
  nome: string;
  email: string;
  avatarUrl?: string;
  cargo?: {
    nomeCargo: string;
    cor?: string;
  };
}

interface MentionAutocompleteProps {
  canalId: string;
  searchTerm: string;
  onSelect: (userId: string, userName: string) => void;
  position: { top: number; left: number };
}

export function MentionAutocomplete({
  canalId,
  searchTerm,
  onSelect,
  position,
}: MentionAutocompleteProps) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await api.get<Usuario[]>(`/chat/${canalId}/usuarios`, {
          params: { q: searchTerm },
        });
        setUsuarios(response || []);
        setSelectedIndex(0);
      } catch {
        setUsuarios([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [canalId, searchTerm]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, usuarios.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && usuarios.length > 0) {
        e.preventDefault();
        const usuario = usuarios[selectedIndex];
        onSelect(usuario.id, usuario.nome);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [usuarios, selectedIndex, onSelect]);

  // Scroll para o item selecionado
  useEffect(() => {
    if (listRef.current) {
      const selectedElement = listRef.current.children[
        selectedIndex
      ] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (loading) {
    return (
      <div
        className="fixed z-[9999] bg-popover border rounded-md shadow-lg p-2"
        style={{ bottom: position.top, left: position.left }}
      >
        <div className="text-sm text-muted-foreground">Buscando...</div>
      </div>
    );
  }

  if (usuarios.length === 0) {
    return null;
  }

  return (
    <div
      ref={listRef}
      className="fixed z-[9999] bg-popover border rounded-md shadow-lg max-h-60 overflow-y-auto"
      style={{ bottom: position.top, left: position.left, minWidth: '250px' }}
    >
      {usuarios.map((usuario, index) => (
        <button
          key={usuario.id}
          className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-accent cursor-pointer transition-colors ${
            index === selectedIndex ? 'bg-accent' : ''
          }`}
          onClick={() => onSelect(usuario.id, usuario.nome)}
          onMouseEnter={() => setSelectedIndex(index)}
        >
          <Avatar className="h-8 w-8">
            {usuario.avatarUrl && (
              <AvatarImage src={usuario.avatarUrl} alt={usuario.nome} />
            )}
            <AvatarFallback className="text-xs">
              {usuario.nome
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 text-left">
            <div className="text-sm font-medium">{usuario.nome}</div>
            {usuario.cargo && (
              <div className="text-xs text-muted-foreground">
                {usuario.cargo.nomeCargo}
              </div>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
