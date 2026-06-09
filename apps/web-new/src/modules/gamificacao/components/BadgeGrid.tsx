
import { BadgeDisplay } from './BadgeDisplay';

interface BadgeGridProps {
  badges: any[];
  size?: 'sm' | 'md' | 'lg';
  maxVisible?: number;
}

export function BadgeGrid({ badges, size = 'md', maxVisible }: BadgeGridProps) {
  const visible = maxVisible ? badges.slice(0, maxVisible) : badges;
  const extra = maxVisible ? Math.max(0, badges.length - maxVisible) : 0;

  if (badges.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        Nenhum badge conquistado ainda.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-3">
      {visible.map((badge) => (
        <BadgeDisplay key={badge.id} badge={badge} size={size} showLabel />
      ))}
      {extra > 0 && (
        <div className="flex flex-col items-center gap-1 justify-center">
          <div className="rounded-full bg-muted p-2 w-9 h-9 flex items-center justify-center text-sm font-medium text-muted-foreground">
            +{extra}
          </div>
        </div>
      )}
    </div>
  );
}
