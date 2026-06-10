import { Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/core/ui/button';

interface RankingControlsProps {
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export function RankingControls({ isFullscreen, onToggleFullscreen }: RankingControlsProps) {
  return (
    <div className="flex items-center gap-1">
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
