import {
  Lock,
  Trophy,
  ShieldAlert,
  Target,
  Zap,
  Award,
  Crown,
  Megaphone,
  Star,
  FilePlus,
  FileText,
  Bell,
  Users,
  KanbanSquare,
  ExternalLink,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/core/ui/button';
import { Badge } from '@/core/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/core/ui/card';
import type { ModuloSlug } from '@/modules/corretora-config/http';

interface FeatureItem {
  icon: LucideIcon;
  title: string;
  description: string;
}

interface ModuleInfo {
  icon: LucideIcon;
  title: string;
  description: string;
  price: string;
  iconBg: string;
  iconColor: string;
  iconBorder: string;
  features: FeatureItem[];
}

const MODULE_CONFIG: Record<ModuloSlug, ModuleInfo> = {
  gamificacao: {
    icon: Trophy,
    title: 'Gamificação',
    description: 'Engaje sua equipe de vendas com metas, missões e reconhecimento em tempo real.',
    price: 'R$ 20,59',
    iconBg: 'bg-yellow-100 dark:bg-yellow-950/40',
    iconColor: 'text-yellow-600 dark:text-yellow-400',
    iconBorder: 'border-yellow-200 dark:border-yellow-800',
    features: [
      {
        icon: Target,
        title: 'Metas de vendas',
        description: 'Metas individuais e por equipe com acompanhamento automático por métrica: prêmio, cotações e renovações.',
      },
      {
        icon: Zap,
        title: 'Missões',
        description: 'Desafios de curto prazo com recompensa em badges para manter a equipe motivada.',
      },
      {
        icon: Award,
        title: 'Badges & Conquistas',
        description: '60+ badges em 5 níveis de raridade — de Comum a Lendário — ganhos por performance real.',
      },
      {
        icon: Crown,
        title: 'Ranking ao vivo',
        description: 'Placar em tempo real por período (mês, trimestre, ano) com visão individual e por equipe.',
      },
      {
        icon: Megaphone,
        title: 'Campanhas',
        description: 'Campanhas internas e com seguradoras parceiras para impulsionar produtos estratégicos.',
      },
      {
        icon: Star,
        title: 'Reconhecimento',
        description: 'Sistema de níveis progressivos por métrica e streak de dias úteis para consistência.',
      },
    ],
  },
  sinistros: {
    icon: ShieldAlert,
    title: 'Sinistros',
    description: 'Gerencie sinistros da sua carteira com acompanhamento completo do processo.',
    price: 'R$ 10,30',
    iconBg: 'bg-orange-100 dark:bg-orange-950/40',
    iconColor: 'text-orange-600 dark:text-orange-400',
    iconBorder: 'border-orange-200 dark:border-orange-800',
    features: [
      {
        icon: FilePlus,
        title: 'Abertura de sinistros',
        description: 'Registre sinistros vinculados a apólices ativas com todos os dados do segurado.',
      },
      {
        icon: KanbanSquare,
        title: 'Kanban de sinistros',
        description: 'Visualize e arraste sinistros entre etapas: Aberto → Em análise → Pago/Recusado.',
      },
      {
        icon: FileText,
        title: 'Histórico completo',
        description: 'Linha do tempo de cada sinistro com responsável, datas e anotações.',
      },
      {
        icon: Bell,
        title: 'Notificações de status',
        description: 'Alertas automáticos na mudança de status para o vendedor responsável.',
      },
    ],
  },
  crm: {
    icon: Users,
    title: 'CRM',
    description: '',
    price: '',
    iconBg: 'bg-blue-100 dark:bg-blue-950/40',
    iconColor: 'text-blue-600 dark:text-blue-400',
    iconBorder: 'border-blue-200 dark:border-blue-800',
    features: [],
  },
};

interface ModuloLockedPageProps {
  modulo: ModuloSlug;
}

export function ModuloLockedPage({ modulo }: ModuloLockedPageProps) {
  const config = MODULE_CONFIG[modulo];
  const Icon = config.icon;

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 sm:p-8">
      <div className="w-full max-w-2xl space-y-8">
        {/* Header */}
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="relative inline-flex">
            <div className={`rounded-2xl border p-5 ${config.iconBg} ${config.iconBorder}`}>
              <Icon className={`size-12 ${config.iconColor}`} />
            </div>
            <div className="absolute -bottom-1.5 -right-1.5 rounded-full border bg-background p-1 shadow-sm">
              <Lock className="size-3.5 text-muted-foreground" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{config.title}</h1>
              <Badge variant="secondary" className="text-xs font-normal">
                Módulo bloqueado
              </Badge>
            </div>
            <p className="max-w-md text-base text-muted-foreground">{config.description}</p>
          </div>
        </div>

        {/* Feature grid */}
        {config.features.length > 0 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {config.features.map((feature) => {
              const FeatureIcon = feature.icon;
              return (
                <Card key={feature.title} className="border-border/60">
                  <CardHeader className="px-4 pb-2 pt-4">
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                      <FeatureIcon className={`size-4 flex-shrink-0 ${config.iconColor}`} />
                      {feature.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Pricing + CTA */}
        <div className="flex flex-col items-center gap-4">
          {config.price && (
            <Badge variant="outline" className="px-3 py-1 text-sm font-normal">
              Disponível a partir de {config.price}/mês
            </Badge>
          )}
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild>
              <a href="/precos">
                Ver planos
                <ExternalLink className="ml-1.5 size-3.5" />
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a
                href={`mailto:suporte@grupoecosistema.com.br?subject=Interesse no módulo ${config.title}`}
              >
                Falar com suporte
              </a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
