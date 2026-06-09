import { Maximize2, Minimize2, ImageIcon, X } from 'lucide-react';
import { Button } from '@/core/ui/button';

interface RankingControlsProps {
  isFullscreen: boolean;
  hasBg: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onToggleFullscreen: () => void;
  onPickImage: () => void;
  onClearImage: () => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function RankingControls({
  isFullscreen,
  hasBg,
  fileInputRef,
  onToggleFullscreen,
  onPickImage,
  onClearImage,
  onFileChange,
}: RankingControlsProps) {
  return (
    <div className="flex items-center gap-1">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFileChange}
      />
      {hasBg && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearImage}
          className="h-7 w-7 p-0 text-white/40 hover:text-white hover:bg-white/10"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
      <Button
        variant="ghost"
        size="sm"
        onClick={onPickImage}
        className="h-7 px-2.5 text-white/50 hover:text-white hover:bg-white/10 gap-1.5 text-[11px]"
      >
        <ImageIcon className="h-3 w-3" />
        Fundo
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggleFullscreen}
        className="h-7 px-2.5 text-white/50 hover:text-white hover:bg-white/10 gap-1.5 text-[11px]"
      >
        {isFullscreen ? (
          <>
            <Minimize2 className="h-3 w-3" />
            Sair
          </>
        ) : (
          <>
            <Maximize2 className="h-3 w-3" />
            Tela Cheia
          </>
        )}
      </Button>
    </div>
  );
}
