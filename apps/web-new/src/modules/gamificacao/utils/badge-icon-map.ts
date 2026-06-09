import {
  Trophy, Star, Zap, Flag, CheckCircle, RefreshCw,
  Medal, Award, Crown, Flame,
} from 'lucide-react';

export { Trophy };
import type { ComponentType } from 'react';

export const badgeIconMap: Record<string, ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  trophy: Trophy,
  star: Star,
  zap: Zap,
  flag: Flag,
  'check-circle': CheckCircle,
  'refresh-cw': RefreshCw,
  medal: Medal,
  award: Award,
  crown: Crown,
  flame: Flame,
};
