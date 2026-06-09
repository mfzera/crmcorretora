
import { useState, useMemo } from 'react';
import { Smile, Search } from 'lucide-react';
import { Button } from '@/core/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/core/ui/popover';
import { cn } from '@/core/utils';

const CATEGORIES = [
  {
    label: '⭐ Frequentes',
    emojis: ['👍', '❤️', '😂', '😮', '😢', '🙏', '👏', '🔥', '🎉', '💯', '✅', '🚀'],
  },
  {
    label: '😀 Rostos',
    emojis: [
      '😀', '😁', '😂', '🤣', '😃', '😄', '😅', '😆', '😉', '😊', '😋', '😎',
      '😍', '🥰', '😘', '😗', '🙂', '🤗', '🤔', '🤨', '😐', '😑', '😶', '🙄',
      '😏', '😣', '😥', '😮', '🤐', '😯', '😪', '😫', '🥱', '😴', '😌', '😛',
      '😜', '😝', '🤤', '😒', '😓', '😔', '😕', '🙃', '🤑', '😲', '☹️', '🙁',
      '😖', '😞', '😟', '😤', '😢', '😭', '😦', '😧', '😨', '😩', '🤯', '😬',
      '😰', '😱', '🥵', '🥶', '😳', '🤪', '😵', '🥴', '😠', '😡', '🤬', '😷',
    ],
  },
  {
    label: '👋 Gestos',
    emojis: [
      '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘',
      '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛',
      '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '💪', '🦾', '🖊️', '✍️',
    ],
  },
  {
    label: '❤️ Símbolos',
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕',
      '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☯️', '🔥', '💯',
      '✅', '❌', '⭕', '🛑', '⚠️', '🚀', '🎉', '🎊', '🎈', '⭐', '🌟', '💫',
    ],
  },
];

type EmojiPickerProps = {
  onEmojiSelect: (emoji: string) => void;
  trigger?: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
};

export function EmojiPicker({ onEmojiSelect, trigger, side = 'top' }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState(0);

  const filteredEmojis = useMemo(() => {
    if (!search.trim()) return null;
    const all = CATEGORIES.flatMap((c) => c.emojis);
    return [...new Set(all)].filter((e) => e.includes(search));
  }, [search]);

  const handleSelect = (emoji: string) => {
    onEmojiSelect(emoji);
    setOpen(false);
    setSearch('');
    setActiveCategory(0);
  };

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) setSearch(''); }}>
      <PopoverTrigger asChild>
        {trigger || (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <Smile className="h-4 w-4" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent side={side} className="w-72 p-0" align="end" sideOffset={4}>
        {/* Search */}
        <div className="flex items-center gap-2 px-3 py-2 border-b">
          <Search className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <input
            type="text"
            placeholder="Buscar emoji..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
            autoFocus
          />
        </div>

        {filteredEmojis ? (
          /* Resultados da busca */
          <div className="p-2 max-h-52 overflow-y-auto">
            {filteredEmojis.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Nenhum emoji encontrado</p>
            ) : (
              <div className="grid grid-cols-8 gap-0.5">
                {filteredEmojis.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleSelect(emoji)}
                    className="text-xl p-1.5 hover:bg-accent rounded transition-colors leading-none"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Tabs de categoria */}
            <div className="flex border-b overflow-x-auto scrollbar-none">
              {CATEGORIES.map((cat, i) => (
                <button
                  key={i}
                  onClick={() => setActiveCategory(i)}
                  className={cn(
                    'flex-shrink-0 px-2 py-1.5 text-xs font-medium transition-colors whitespace-nowrap',
                    activeCategory === i
                      ? 'border-b-2 border-primary text-primary'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {cat.label.split(' ')[0]}
                </button>
              ))}
            </div>

            {/* Grade de emojis */}
            <div className="p-2 max-h-48 overflow-y-auto">
              <div className="grid grid-cols-8 gap-0.5">
                {CATEGORIES[activeCategory]?.emojis.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleSelect(emoji)}
                    className="text-xl p-1.5 hover:bg-accent rounded transition-colors leading-none"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
