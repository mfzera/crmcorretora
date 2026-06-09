import { type LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  iconClassName?: string;
}

export function PageHeader({ icon: Icon, title, description, actions, iconClassName }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-1">
        <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight">
          <div className={`rounded-xl bg-primary/10 p-2.5 ring-1 ring-primary/20 ${iconClassName ?? ''}`}>
            <Icon className="h-7 w-7 text-primary" />
          </div>
          {title}
        </h1>
        {description && (
          <p className="text-muted-foreground pl-[52px]">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
